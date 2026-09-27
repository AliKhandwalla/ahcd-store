import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { describe, it } from "node:test";

import { createClient } from "@supabase/supabase-js";

/**
 * Security properties of the newsletter RPCs, exercised with the anonymous
 * publishable key — the same privilege any visitor has, since that key is
 * compiled into the client bundle by design.
 *
 * SKIPPED BY DEFAULT. Opt in with NEWSLETTER_RPC_TESTS=1.
 * Sends no email and calls no email provider.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const optedIn = process.env.NEWSLETTER_RPC_TESTS === "1";
const skip = !optedIn
  ? "set NEWSLETTER_RPC_TESTS=1 to run live RPC tests"
  : !url || !key
    ? "NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY not set"
    : false;

const sb = url && key ? createClient(url, key) : null;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

function fixture() {
  const token = randomBytes(32).toString("base64url");
  return {
    tokenHash: hash(token),
    email: `ahcd-sec-${randomBytes(6).toString("hex")}@test.invalid`,
  };
}

async function request(secret: string | null, f = fixture()) {
  const { data, error } = await sb!.rpc("newsletter_request", {
    p_email: f.email,
    p_token_hash: f.tokenHash,
    p_consent_version: "security-test",
    p_expires_at: new Date(Date.now() + 600_000).toISOString(),
    p_app_secret: secret,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return { error, shouldSend: Boolean(row?.should_send), fixture: f };
}

async function consume(tokenHash: string) {
  await sb!.rpc("newsletter_consume", { p_token_hash: tokenHash });
}

describe("newsletter signup RPC is not reachable without the server secret", { skip }, () => {
  it("refuses a call with no secret", async () => {
    const r = await request(null);
    assert.equal(r.error, null, "the call should be refused, not error");
    assert.equal(
      r.shouldSend,
      false,
      "holding the publishable key must not be enough to create a pending signup",
    );
  });

  it("refuses a wrong secret", async () => {
    for (const wrong of ["", "guess", randomBytes(32).toString("base64url")]) {
      const r = await request(wrong);
      assert.equal(r.shouldSend, false, `secret ${JSON.stringify(wrong.slice(0, 8))}`);
    }
  });

  it("creates no pending row when the secret is wrong", async () => {
    const f = fixture();
    await request("definitely-not-the-secret", f);
    const { data } = await sb!.rpc("newsletter_peek", { p_token_hash: f.tokenHash });
    assert.equal(
      (data as unknown[] | null)?.length ?? 0,
      0,
      "a refused call must not leave a row behind",
    );
  });

  it("the old ungated four-argument version is gone", async () => {
    const { error } = await sb!.rpc("newsletter_request", {
      p_email: "ahcd-legacy@test.invalid",
      p_token_hash: hash("legacy"),
      p_consent_version: "security-test",
      p_expires_at: new Date(Date.now() + 600_000).toISOString(),
    });
    assert.ok(error, "calling without p_app_secret must not resolve to a function");
  });

  it("accepts the real secret, so legitimate signups still work", async function () {
    const secret = process.env.NEWSLETTER_RPC_SECRET;
    if (!secret) {
      // Not configured in this environment; the refusal cases above still ran.
      return;
    }
    const r = await request(secret);
    assert.equal(r.shouldSend, true, "the configured secret must be accepted");
    await consume(r.fixture.tokenHash);
  });
});

describe("newsletter tables and admin functions are not anonymously reachable", { skip }, () => {
  it("app_config cannot be read with the publishable key", async () => {
    const { data, error } = await sb!.from("app_config").select("key, value");
    assert.ok(
      error || (data ?? []).length === 0,
      "the secret hash and caps must not be readable by anyone holding the publishable key",
    );
  });

  it("app_config cannot be written with the publishable key", async () => {
    const { error } = await sb!
      .from("app_config")
      .insert({ key: "newsletter_rpc_secret_sha256", value: hash("attacker") });
    assert.ok(error, "an anonymous caller must not be able to set the signup secret");
  });

  it("newsletter_pending cannot be read with the publishable key", async () => {
    const { data, error } = await sb!.from("newsletter_pending").select("email");
    assert.ok(error || (data ?? []).length === 0);
  });

  it("the expired-row cleanup refuses an anonymous caller", async () => {
    const { error } = await sb!.rpc("newsletter_prune_expired");
    assert.ok(error, "prune must refuse anyone who is not the admin");
  });

  it("the expired-row count refuses an anonymous caller", async () => {
    const { error } = await sb!.rpc("newsletter_expired_count");
    assert.ok(error, "the count must refuse anyone who is not the admin");
  });
});
