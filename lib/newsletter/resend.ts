import "server-only";

import { contactsApiKey, sendingConfig } from "@/lib/newsletter/config";

/**
 * Minimal typed Resend client.
 *
 * A small fetch wrapper rather than the SDK: only three endpoints are needed,
 * Resend has no API versioning to track, and this project keeps dependencies
 * minimal.
 *
 * Two details that are easy to get wrong, both handled here:
 *   - Resend REQUIRES a User-Agent header; without one it returns 403.
 *   - The rate limit is 10 requests/second per team, so contact pagination is
 *     sequential rather than parallel.
 *
 * Calls return typed results instead of throwing, so callers can report an
 * honest failure rather than implying success.
 */

const API_BASE = "https://api.resend.com";
const USER_AGENT = "ahcd-store/1.0 (+https://alisheatcrunchdelight.com)";
const TIMEOUT_MS = 10_000;

export type ResendResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ResendContact = {
  id: string;
  email: string;
  created_at: string;
  unsubscribed: boolean;
};

async function request<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<ResendResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Omitting this returns 403 from Resend.
        "User-Agent": USER_AGENT,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      // Resend's own message is useful for operators (it names the exact
      // permission problem), but it must never reach a public visitor — only
      // admin surfaces render this string.
      let detail = "";
      try {
        const body = (await response.json()) as { message?: string };
        if (body?.message) detail = ` ${body.message}`;
      } catch {
        // Non-JSON body; the status code alone will have to do.
      }
      return {
        ok: false,
        error: `Email provider returned ${response.status}.${detail}`,
      };
    }

    // 204 and other empty bodies would throw on .json().
    const text = await response.text();
    const data = (text ? JSON.parse(text) : {}) as T;
    return { ok: true, data };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "The email provider timed out."
        : "Couldn't reach the email provider.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Transactional send, using the restricted sending key.
 *
 * Used for double opt-in confirmations and the admin's test-to-self. Never
 * used for bulk delivery — broadcasts would go through Resend's Broadcast
 * API, which is not wired up.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const sending = sendingConfig();
  if (!sending) {
    return { ok: false as const, error: "Email sending is not configured." };
  }

  return request<{ id: string }>("/emails", sending.apiKey, {
    method: "POST",
    body: JSON.stringify({
      from: sending.from,
      to: params.to,
      reply_to: sending.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });
}

/**
 * Creates or reactivates a contact after a confirmed double opt-in.
 *
 * Requires the full-access key. Consent evidence rides along as contact
 * properties, so there is no parallel consent table and the record travels
 * with the contact.
 */
export async function upsertConfirmedContact(params: {
  email: string;
  consentVersion: string;
  consentedAt: string;
}) {
  const key = contactsApiKey();
  if (!key) {
    return {
      ok: false as const,
      error:
        "Subscriber management is not configured (needs a full-access Resend key).",
    };
  }

  return request<{ id: string }>("/contacts", key, {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      // Only ever false, and only after a confirmed opt-in — an unsubscribed
      // contact is never silently reactivated.
      unsubscribed: false,
      properties: {
        consent_version: params.consentVersion,
        consented_at: params.consentedAt,
        confirmed_at: new Date().toISOString(),
        source: "website",
      },
    }),
  });
}

export type ContactTotals = {
  confirmed: number;
  unsubscribed: number;
  recent: number;
  truncated: boolean;
};

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 2,000 contacts; well beyond current scale.

/**
 * Aggregate counts for the admin dashboard. Requires the full-access key.
 *
 * Resend's list endpoint returns no total, so this pages through with the
 * documented cursor, sequentially to respect the 10 req/s limit. Only counts
 * are returned — individual addresses never leave this function, so
 * subscriber data stays private even from the dashboard.
 */
export async function getContactTotals(): Promise<ResendResult<ContactTotals>> {
  const key = contactsApiKey();
  if (!key) {
    return {
      ok: false,
      error:
        "Needs a Resend full-access key (RESEND_CONTACTS_API_KEY). The sending key cannot read contacts.",
    };
  }

  let confirmed = 0;
  let unsubscribed = 0;
  let recent = 0;
  let after: string | undefined;
  let truncated = false;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (after) query.set("after", after);

    const result = await request<{
      data: ResendContact[];
      has_more?: boolean;
    }>(`/contacts?${query.toString()}`, key);

    if (!result.ok) return result;

    const contacts = result.data.data ?? [];
    for (const contact of contacts) {
      if (contact.unsubscribed) unsubscribed++;
      else confirmed++;
      if (new Date(contact.created_at).getTime() >= thirtyDaysAgo) recent++;
    }

    if (!result.data.has_more || contacts.length === 0) {
      return { ok: true, data: { confirmed, unsubscribed, recent, truncated } };
    }

    after = contacts[contacts.length - 1]?.id;
    if (!after) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }

  return { ok: true, data: { confirmed, unsubscribed, recent, truncated } };
}
