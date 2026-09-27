import "server-only";

/**
 * Newsletter configuration and readiness.
 *
 * TWO KEYS, DELIBERATELY
 * ----------------------
 * Resend offers only two API-key permission levels: `sending_access` and
 * `full_access`. There is no contacts-only scope. Managing subscribers
 * therefore needs a full-access key, while sending needs only the restricted
 * one.
 *
 * So this project uses both:
 *   RESEND_API_KEY           sending_access — sends confirmation and test mail
 *   RESEND_CONTACTS_API_KEY  full_access    — creates/reads contacts
 *
 * Splitting them keeps the key used on every public signup at least
 * privilege; the powerful key is only touched at confirmation time and by the
 * admin dashboard. The sending key is never silently used for contacts, and
 * neither key is ever replaced by the other.
 */

export type SendingConfig = {
  apiKey: string;
  from: string;
  replyTo: string;
};

/** Sending is possible: confirmation emails and admin test sends can go out. */
export function sendingConfig(): SendingConfig | null {
  const apiKey = value("RESEND_API_KEY");
  const from = value("RESEND_FROM_EMAIL");
  const replyTo = value("RESEND_REPLY_TO");
  if (!apiKey || !from || !replyTo) return null;
  return { apiKey, from, replyTo };
}

/** Contacts management is possible: subscribers can actually be created. */
export function contactsApiKey() {
  return value("RESEND_CONTACTS_API_KEY");
}

export type NewsletterReadiness =
  | { ready: true; from: string; replyTo: string }
  | { ready: false; reason: string };

export const CONSENT_VERSION = "2026-09-26";
export const CONFIRMATION_TTL_HOURS = 24;

function value(name: string) {
  const raw = process.env[name];
  return raw && raw.trim() !== "" ? raw.trim() : null;
}

/**
 * Whether the site may accept public signups.
 *
 * Requires the contacts key as well as sending: without it a visitor could
 * confirm and still not become a subscriber, which would be a worse
 * experience than saying signups aren't open. Resend stays the single source
 * of truth — we never park "confirmed" people in Supabase as a workaround.
 */
const AFFIRMATIVE = ["true", "1", "yes", "on"];

/**
 * Whether signups are explicitly switched on.
 *
 * FAIL CLOSED: anything that isn't an unambiguous yes means off — unset,
 * empty, "false", "False", "no", or a typo. The previous logic disabled only
 * on the exact lowercase string "false", so a misspelling would silently
 * *enable* public signups. Defaulting to off is the safe direction for a
 * system that emails members of the public.
 */
export function isNewsletterExplicitlyEnabled() {
  const raw = (process.env.NEWSLETTER_ENABLED ?? "").trim().toLowerCase();
  return AFFIRMATIVE.includes(raw);
}

export function newsletterReadiness(): NewsletterReadiness {
  if (!isNewsletterExplicitlyEnabled()) {
    return {
      ready: false,
      reason:
        "Signups are switched off. Set NEWSLETTER_ENABLED=true to open them.",
    };
  }

  const sending = sendingConfig();
  if (!sending) {
    return {
      ready: false,
      reason:
        "Email sending is not fully configured (key, from address or reply-to missing).",
    };
  }

  if (!contactsApiKey()) {
    return {
      ready: false,
      reason:
        "Subscriber management needs a Resend full-access key (RESEND_CONTACTS_API_KEY). The current key can only send email.",
    };
  }

  return { ready: true, from: sending.from, replyTo: sending.replyTo };
}

/** The published privacy contact, which is the verified reply-to address. */
export function publishableContactEmail() {
  return value("RESEND_REPLY_TO");
}
