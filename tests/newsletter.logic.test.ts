import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";

import {
  createConfirmationToken,
  hashToken,
  hashesMatch,
  looksLikeEmail,
  normaliseEmail,
} from "../lib/newsletter/tokens.ts";

/**
 * Pure-logic regression tests. No network, no database, no email.
 *
 * `lib/newsletter/config.ts` is imported dynamically inside each case because
 * it reads process.env at call time and the module is cached — importing it
 * once at the top and mutating env between cases is the correct pattern here,
 * but the import must happen after the first mutation to keep the intent
 * obvious.
 */

const ORIGINAL = process.env.NEWSLETTER_ENABLED;

beforeEach(() => {
  delete process.env.NEWSLETTER_ENABLED;
});

after(() => {
  if (ORIGINAL === undefined) delete process.env.NEWSLETTER_ENABLED;
  else process.env.NEWSLETTER_ENABLED = ORIGINAL;
});

describe("NEWSLETTER_ENABLED parsing", () => {
  it("treats unambiguous affirmatives as enabled", async () => {
    const { isNewsletterExplicitlyEnabled } = await import(
      "../lib/newsletter/config.ts"
    );
    for (const raw of ["true", "TRUE", " True ", "1", "yes", "YES", "on"]) {
      process.env.NEWSLETTER_ENABLED = raw;
      assert.equal(
        isNewsletterExplicitlyEnabled(),
        true,
        `expected ${JSON.stringify(raw)} to enable signups`,
      );
    }
  });

  it("fails closed for anything else", async () => {
    const { isNewsletterExplicitlyEnabled } = await import(
      "../lib/newsletter/config.ts"
    );
    // The bug this guards: the old logic disabled only on the exact string
    // "false", so "ture", "off" or an empty value silently ENABLED public
    // signups. Every one of these must be off.
    const offValues = [
      "false",
      "False",
      "FALSE",
      "no",
      "off",
      "0",
      "",
      "   ",
      "ture",
      "tru",
      "enabled",
      "disabled",
      "null",
      "undefined",
    ];
    for (const raw of offValues) {
      process.env.NEWSLETTER_ENABLED = raw;
      assert.equal(
        isNewsletterExplicitlyEnabled(),
        false,
        `expected ${JSON.stringify(raw)} to leave signups off`,
      );
    }
  });

  it("is off when the variable is not set at all", async () => {
    const { isNewsletterExplicitlyEnabled } = await import(
      "../lib/newsletter/config.ts"
    );
    delete process.env.NEWSLETTER_ENABLED;
    assert.equal(isNewsletterExplicitlyEnabled(), false);
  });

  it("reports not-ready with a reason while switched off", async () => {
    const { newsletterReadiness } = await import("../lib/newsletter/config.ts");
    process.env.NEWSLETTER_ENABLED = "false";
    const readiness = newsletterReadiness();
    assert.equal(readiness.ready, false);
    assert.ok(
      readiness.ready === false && readiness.reason.length > 0,
      "a not-ready result must explain itself",
    );
  });

  it("stays not-ready when enabled but the provider is unconfigured", async () => {
    const { newsletterReadiness } = await import("../lib/newsletter/config.ts");
    process.env.NEWSLETTER_ENABLED = "true";
    const saved = {
      key: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
      reply: process.env.RESEND_REPLY_TO,
      contacts: process.env.RESEND_CONTACTS_API_KEY,
    };
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_REPLY_TO;
    delete process.env.RESEND_CONTACTS_API_KEY;
    try {
      assert.equal(newsletterReadiness().ready, false);
    } finally {
      if (saved.key) process.env.RESEND_API_KEY = saved.key;
      if (saved.from) process.env.RESEND_FROM_EMAIL = saved.from;
      if (saved.reply) process.env.RESEND_REPLY_TO = saved.reply;
      if (saved.contacts) process.env.RESEND_CONTACTS_API_KEY = saved.contacts;
    }
  });
});

describe("confirmation tokens", () => {
  it("stores only a SHA-256 hash, never the token", () => {
    const { token, tokenHash } = createConfirmationToken();
    assert.notEqual(token, tokenHash);
    assert.match(tokenHash, /^[0-9a-f]{64}$/);
    assert.equal(
      tokenHash,
      createHash("sha256").update(token).digest("hex"),
      "hash must be a plain SHA-256 of the token",
    );
    assert.ok(!tokenHash.includes(token));
  });

  it("produces a URL-safe token with enough entropy", () => {
    const { token } = createConfirmationToken();
    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.ok(token.length >= 42, `token too short: ${token.length}`);
  });

  it("never repeats a token", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(createConfirmationToken().token);
    assert.equal(seen.size, 500);
  });

  it("hashes deterministically so a link can be looked up", () => {
    assert.equal(hashToken("abc"), hashToken("abc"));
    assert.notEqual(hashToken("abc"), hashToken("abd"));
  });

  it("compares hashes without leaking length mismatches as throws", () => {
    const a = hashToken("one");
    assert.equal(hashesMatch(a, a), true);
    assert.equal(hashesMatch(a, hashToken("two")), false);
    assert.equal(hashesMatch(a, "short"), false);
  });
});

describe("email handling", () => {
  it("normalises case and surrounding whitespace", () => {
    assert.equal(normaliseEmail("  Ali@Example.COM \n"), "ali@example.com");
  });

  it("accepts ordinary addresses", () => {
    for (const email of [
      "a@b.co",
      "ali@example.com",
      "first.last+tag@sub.example.co.uk",
    ]) {
      assert.equal(looksLikeEmail(email), true, email);
    }
  });

  it("rejects input that clearly is not an address", () => {
    for (const email of [
      "",
      "ali",
      "ali@",
      "@example.com",
      "ali@example",
      "ali@.com",
      "ali@example.",
      "ali@ex..com",
      "ali example@x.com",
      "a@b@c.com",
      `${"x".repeat(65)}@example.com`,
      `${"x".repeat(250)}@example.com`,
    ]) {
      assert.equal(looksLikeEmail(email), false, JSON.stringify(email));
    }
  });
});
