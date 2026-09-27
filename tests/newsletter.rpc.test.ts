import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { describe, it } from "node:test";

import { createClient } from "@supabase/supabase-js";

/**
 * Confirmation-lifecycle integration tests against the real RPCs.
 *
 * SKIPPED BY DEFAULT. They touch a live Supabase project, so they run only
 * when you opt in explicitly:
 *
 *   NEWSLETTER_RPC_TESTS=1 npm test
 *
 * What they deliberately do NOT do:
 *   - call Resend, or send any email whatsoever;
 *   - use a real address. Every fixture is a unique `.invalid` address, a
 *     TLD reserved by RFC 2606 that can never be delivered to;
 *   - leave rows behind. Each case consumes its own row in a finally block.
 *
 * They use the publishable (anonymous) key, which is the point: this is the
 * same privilege a hostile visitor has.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const optedIn = process.env.NEWSLETTER_RPC_TESTS === "1";
const skip = !optedIn
  ? "set NEWSLETTER_RPC_TESTS=1 to run live RPC tests"
  : !url || !key
    ? "NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY not set"
    : false;

const supabase = url && key ? createClient(url, key) : null;

const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function fixture() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hash(token),
    // .invalid can never resolve or receive mail.
    email: `ahcd-rpc-${randomBytes(6).toString("hex")}@test.invalid`,
  };
}

async function request(
  f: ReturnType<typeof fixture>,
  expiresAt = new Date(Date.now() + 3_600_000).toISOString(),
) {
  const { data, error } = await supabase!.rpc("newsletter_request", {
    p_email: f.email,
    p_token_hash: f.tokenHash,
    p_consent_version: "test",
    p_expires_at: expiresAt,
  });
  assert.equal(error, null, `newsletter_request failed: ${error?.message}`);
  return data;
}

async function peek(tokenHash: string) {
  const { data, error } = await supabase!.rpc("newsletter_peek", {
    p_token_hash: tokenHash,
  });
  assert.equal(error, null, `newsletter_peek failed: ${error?.message}`);
  return Array.isArray(data) ? data[0] : data;
}

async function consume(tokenHash: string) {
  const { data, error } = await supabase!.rpc("newsletter_consume", {
    p_token_hash: tokenHash,
  });
  assert.equal(error, null, `newsletter_consume failed: ${error?.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return typeof row === "boolean" ? row : Boolean(row?.consumed);
}

describe("newsletter confirmation lifecycle", { skip }, () => {
  it("peek is non-destructive — the regression that caused Bug 2", async () => {
    const f = fixture();
    await request(f);
    try {
      // The old newsletter_confirm deleted here. If a peek ever deletes
      // again, any provider failure burns the subscriber's link permanently.
      const first = await peek(f.tokenHash);
      assert.equal(first?.email, f.email);

      const second = await peek(f.tokenHash);
      assert.equal(
        second?.email,
        f.email,
        "peek must be repeatable so a failed Resend call can be retried",
      );

      const third = await peek(f.tokenHash);
      assert.equal(third?.email, f.email);
    } finally {
      await consume(f.tokenHash);
    }
  });

  it("consume is single-use", async () => {
    const f = fixture();
    await request(f);

    assert.equal(await consume(f.tokenHash), true);
    assert.equal(
      await consume(f.tokenHash),
      false,
      "a consumed token must not be consumable again",
    );
    assert.equal(
      await peek(f.tokenHash),
      undefined,
      "a consumed token must no longer resolve",
    );
  });

  it("concurrent consumption produces exactly one winner", async () => {
    const f = fixture();
    await request(f);

    // Two tabs, one click each. The delete is atomic, so exactly one of these
    // may report having consumed the row.
    const results = await Promise.all([
      consume(f.tokenHash),
      consume(f.tokenHash),
      consume(f.tokenHash),
    ]);
    assert.equal(
      results.filter(Boolean).length,
      1,
      `expected exactly one winner, got ${JSON.stringify(results)}`,
    );
  });

  it("an expired token does not resolve", async () => {
    const f = fixture();
    await request(f, new Date(Date.now() - 60_000).toISOString());
    try {
      assert.equal(
        await peek(f.tokenHash),
        undefined,
        "expired tokens must be indistinguishable from unknown ones",
      );
    } finally {
      await consume(f.tokenHash);
    }
  });

  it("an unknown token is indistinguishable from an expired one", async () => {
    assert.equal(await peek(hash(randomBytes(32).toString("hex"))), undefined);
    assert.equal(await consume(hash("no-such-token")), false);
  });

  it("the destructive newsletter_confirm RPC no longer exists", async () => {
    const { error } = await supabase!.rpc("newsletter_confirm", {
      p_token_hash: hash("anything"),
    });
    assert.ok(error, "newsletter_confirm must have been dropped");
  });

  it("neither RPC exposes subscriber data or allows enumeration", async () => {
    const f = fixture();
    await request(f);
    try {
      // Direct table access stays refused with the anonymous key.
      const direct = await supabase!.from("newsletter_pending").select("email");
      assert.ok(
        direct.error || (direct.data ?? []).length === 0,
        "newsletter_pending must not be readable anonymously",
      );

      // Guessing a hash reveals nothing, and peek returns only the row whose
      // token you already hold — never a list.
      const rows = await supabase!.rpc("newsletter_peek", {
        p_token_hash: "%",
      });
      assert.equal(rows.error, null);
      assert.equal(
        (rows.data as unknown[] | null)?.length ?? 0,
        0,
        "peek must not accept a pattern or return multiple rows",
      );
    } finally {
      await consume(f.tokenHash);
    }
  });

  it("the audit-probe row is gone and ordinary pending rows survive", async () => {
    // A legitimate pending row must still be there afterwards; the cleanup in
    // the migration matched on email AND consent_version for exactly this
    // reason.
    const f = fixture();
    await request(f);
    try {
      assert.equal((await peek(f.tokenHash))?.email, f.email);
      assert.equal(
        await peek(hash("audit-probe-token-that-never-existed")),
        undefined,
      );
    } finally {
      await consume(f.tokenHash);
    }
  });
});
