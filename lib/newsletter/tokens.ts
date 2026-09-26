import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Confirmation tokens.
 *
 * A 32-byte random token is emailed to the subscriber; only its SHA-256 hash
 * is stored. A database leak therefore cannot be used to confirm anybody's
 * address, and the token is single-use because the row is deleted on
 * confirmation.
 */

export function createConfirmationToken() {
  // base64url: URL-safe without escaping, ~43 characters.
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison, for anywhere two hashes are compared in app code. */
export function hashesMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Conservative email validation.
 *
 * Deliberately not trying to implement RFC 5322 — the confirmation email is
 * the real test of whether an address works. This only rejects input that
 * clearly isn't an address.
 */
export function normaliseEmail(input: string) {
  return input.trim().toLowerCase();
}

export function looksLikeEmail(email: string) {
  if (email.length < 6 || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64) return false;
  if (!domain || !domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  return true;
}
