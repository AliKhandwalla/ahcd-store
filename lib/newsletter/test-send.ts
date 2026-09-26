"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { sendingConfig } from "@/lib/newsletter/config";
import { sendEmail } from "@/lib/newsletter/resend";
import { renderUpdateEmail } from "@/lib/newsletter/update-email";
import { getPublishedUpdateBySlug, listAllUpdates } from "@/lib/updates/queries";

export type TestSendState =
  | { status: "idle" }
  | { status: "sent"; message: string }
  | { status: "error"; message: string };

/**
 * Cooldown between test sends.
 *
 * Module-level, so it is per server instance rather than global. That is
 * enough to stop an accidental double-click or an impatient repeat click,
 * which is what this guards against — it is not a defence against a
 * determined attacker, and it doesn't need to be: the action is behind admin
 * authentication and can only ever mail the administrator.
 */
const COOLDOWN_MS = 30_000;
let lastSentAt = 0;

/**
 * Sends the previewed newsletter to the administrator, and only to the
 * administrator.
 *
 * Security properties, all enforced server-side:
 *   - requireAdmin() runs first; a server action is a public endpoint and the
 *     admin layout does not protect it.
 *   - The recipient comes from ADMIN_EMAIL on the server. No address is
 *     accepted from the browser, so this cannot be turned into an open relay.
 *   - Only one address is ever passed to Resend, so it cannot broadcast.
 *   - Only PUBLISHED updates can be rendered, so drafts can never be mailed.
 */
export async function sendTestNewsletter(
  _prev: TestSendState,
  formData: FormData,
): Promise<TestSendState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { status: "error", message: "Not authorised." };

  const sending = sendingConfig();
  if (!sending) {
    return {
      status: "error",
      message:
        "Email sending isn't configured (key, from address or reply-to missing).",
    };
  }

  // The verified admin's own address, from the server session — never from
  // the form.
  const recipient = gate.user.email;
  if (!recipient) {
    return { status: "error", message: "Your account has no email address." };
  }

  const elapsed = Date.now() - lastSentAt;
  if (elapsed < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return {
      status: "error",
      message: `Just sent one. Try again in ${wait}s.`,
    };
  }

  const updateId = String(formData.get("updateId") ?? "");
  if (!updateId) return { status: "error", message: "No update selected." };

  // Resolve through the published-only list, so a draft can never be sent
  // even if its id is submitted directly.
  const all = await listAllUpdates();
  const chosen = all.find(
    (row) => row.id === updateId && row.status === "published",
  );
  if (!chosen) {
    return {
      status: "error",
      message: "That update isn't published, so it can't be sent.",
    };
  }

  const full = await getPublishedUpdateBySlug(chosen.slug);
  if (!full) {
    return { status: "error", message: "Couldn't load that update." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
    : "https://alisheatcrunchdelight.com";

  const rendered = renderUpdateEmail(full, siteUrl, { isTest: true });

  const result = await sendEmail({
    to: recipient,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  });

  if (!result.ok) {
    // Report the provider's actual failure rather than a generic success.
    return { status: "error", message: result.error };
  }

  lastSentAt = Date.now();

  return {
    status: "sent",
    message: `Sent to ${recipient}. Check your inbox — it may take a moment.`,
  };
}
