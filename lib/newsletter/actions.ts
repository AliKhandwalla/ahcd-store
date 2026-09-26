"use server";

import {
  CONFIRMATION_TTL_HOURS,
  CONSENT_VERSION,
  newsletterReadiness,
} from "@/lib/newsletter/config";
import { confirmationEmail } from "@/lib/newsletter/email";
import { sendEmail } from "@/lib/newsletter/resend";
import {
  createConfirmationToken,
  looksLikeEmail,
  normaliseEmail,
} from "@/lib/newsletter/tokens";
import { createClient } from "@/lib/supabase/server";

export type SubscribeState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

/**
 * The single response shown for every accepted submission.
 *
 * Identical whether the address is brand new, already pending, already
 * subscribed, or previously unsubscribed — so the form cannot be used to work
 * out who is on the list.
 */
const GENERIC_SUCCESS =
  "Thanks — check your inbox for a confirmation link. It expires in 24 hours.";

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return `https://${configured}`;
  return "https://alisheatcrunchdelight.com";
}

export async function subscribeToNewsletter(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  // Refuse outright while the newsletter isn't ready. Never imply success.
  const readiness = newsletterReadiness();
  if (!readiness.ready) {
    return {
      status: "error",
      message: "Signups aren't open yet. Please check back soon.",
    };
  }

  // Honeypot: a real person never fills a hidden field. Respond as though it
  // worked so a bot gets no signal.
  if (String(formData.get("website") ?? "") !== "") {
    return { status: "success", message: GENERIC_SUCCESS };
  }

  // Minimum fill time. Humans take more than a couple of seconds.
  const startedAt = Number(String(formData.get("startedAt") ?? "0"));
  if (startedAt > 0 && Date.now() - startedAt < 2000) {
    return { status: "success", message: GENERIC_SUCCESS };
  }

  const email = normaliseEmail(String(formData.get("email") ?? ""));
  if (!email) {
    return { status: "error", message: "Enter your email address." };
  }
  if (!looksLikeEmail(email)) {
    return {
      status: "error",
      message: "That doesn't look like an email address. Please check it.",
    };
  }

  // Consent must be explicit. The checkbox ships unchecked.
  if (String(formData.get("consent") ?? "") !== "on") {
    return {
      status: "error",
      message: "Please tick the box to agree to receive emails.",
    };
  }

  const { token, tokenHash } = createConfirmationToken();
  const expiresAt = new Date(
    Date.now() + CONFIRMATION_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createClient();

  // Goes through the SECURITY DEFINER function; the table itself is
  // unreadable and unwritable by this role. Throttling lives in the function
  // so it can't be bypassed by calling the RPC directly.
  const { data, error } = await supabase.rpc("newsletter_request", {
    p_email: email,
    p_token_hash: tokenHash,
    p_consent_version: CONSENT_VERSION,
    p_expires_at: expiresAt,
  });

  if (error) {
    return {
      status: "error",
      message: "Something went wrong. Please try again in a moment.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const shouldSend = Boolean(row?.should_send);

  // Throttled or capped: say the same thing as a success so repeat attempts
  // reveal nothing, but send no email.
  if (!shouldSend) {
    return { status: "success", message: GENERIC_SUCCESS };
  }

  const confirmUrl = `${siteUrl()}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = confirmationEmail(confirmUrl);

  const sent = await sendEmail({ to: email, subject, html, text });

  // A provider failure is reported honestly rather than claimed as success.
  if (!sent.ok) {
    return {
      status: "error",
      message:
        "We couldn't send the confirmation email just now. Please try again shortly.",
    };
  }

  return { status: "success", message: GENERIC_SUCCESS };
}
