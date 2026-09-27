"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { contactsApiKey, sendingConfig } from "@/lib/newsletter/config";

/**
 * On-demand Resend configuration check.
 *
 * Deliberately NOT run at startup, build time, or on page render — it makes
 * live API calls and would add latency and rate-limit pressure to every
 * request. The administrator triggers it from /admin/newsletter.
 *
 * It exists because presence checks were not enough. Two real production
 * failures would have been caught here:
 *   - a contacts key that was actually sending-only, so subscribers could
 *     never be created;
 *   - the four consent properties not being predefined in Resend, which made
 *     every confirmation fail with a 422.
 */

const API = "https://api.resend.com";
const UA = "ahcd-store/1.0 (+https://alisheatcrunchdelight.com)";
const REQUIRED_PROPERTIES = [
  "consent_version",
  "consented_at",
  "confirmed_at",
  "source",
] as const;

export type CheckResult = {
  label: string;
  ok: boolean;
  detail: string;
};

async function call(path: string, key: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${API}${path}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "User-Agent": UA },
      cache: "no-store",
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    };
  } catch {
    return { status: 0, body: {} as Record<string, unknown> };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyResendConfiguration(): Promise<CheckResult[]> {
  const gate = await requireAdmin();
  if (!gate.ok) return [{ label: "Authorisation", ok: false, detail: "Not authorised." }];

  const results: CheckResult[] = [];

  const sending = sendingConfig();
  results.push({
    label: "Sending configuration",
    ok: Boolean(sending),
    detail: sending
      ? `From ${sending.from}, reply-to ${sending.replyTo}`
      : "RESEND_API_KEY, RESEND_FROM_EMAIL or RESEND_REPLY_TO is missing.",
  });

  const key = contactsApiKey();
  if (!key) {
    results.push({
      label: "Contacts key",
      ok: false,
      detail: "RESEND_CONTACTS_API_KEY is not set. Subscribers cannot be created.",
    });
    return results;
  }

  // Scope check: a sending-only key returns 401 restricted_api_key here.
  const contacts = await call("/contacts?limit=1", key);
  const scopeOk = contacts.status === 200;
  results.push({
    label: "Contacts key scope",
    ok: scopeOk,
    detail: scopeOk
      ? "Full access confirmed — can read and create contacts."
      : contacts.status === 401
        ? "Key is restricted to sending only. A full-access key is required."
        : contacts.status === 0
          ? "Could not reach Resend."
          : `Unexpected status ${contacts.status}.`,
  });

  // Property check: undefined properties make every confirmation fail with 422.
  const props = await call("/contact-properties", key);
  if (props.status !== 200) {
    results.push({
      label: "Consent properties",
      ok: false,
      detail:
        props.status === 0
          ? "Could not reach Resend."
          : `Could not list contact properties (status ${props.status}).`,
    });
    return results;
  }

  const defined = new Set(
    ((props.body.data as { key?: string }[] | undefined) ?? [])
      .map((p) => p.key)
      .filter((k): k is string => Boolean(k)),
  );
  const missing = REQUIRED_PROPERTIES.filter((p) => !defined.has(p));

  results.push({
    label: "Consent properties",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `All present: ${REQUIRED_PROPERTIES.join(", ")}`
        : `Missing in Resend: ${missing.join(", ")}. Confirmations will fail with 422 until these are created.`,
  });

  return results;
}
