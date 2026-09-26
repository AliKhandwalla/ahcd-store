import "server-only";

import { publishableContactEmail } from "@/lib/newsletter/config";
import { formatEventRange } from "@/lib/updates/time";
import type { UpdateWithImages } from "@/lib/updates/types";

/**
 * Renders a published Update as newsletter HTML.
 *
 * IMAGES: update photos live in a private bucket behind signed URLs that
 * expire within the hour. Those must never go in an email — the picture would
 * break in the recipient's inbox shortly after delivery. Instead this uses the
 * stable /og/update/[slug] proxy: an absolute, permanent, public URL that
 * serves only published updates.
 *
 * HTML: table-free but inline-styled, since email clients are unreliable with
 * modern CSS. A plain-text alternative always accompanies it.
 *
 * Broadcasts are NOT enabled. `{{{RESEND_UNSUBSCRIBE_URL}}}` is Resend's
 * per-recipient placeholder and is only meaningful in a real Broadcast; in an
 * admin test send it is replaced with a harmless note instead.
 */

const NAVY = "#030e29";
const NAVY_SOFT = "#0b1a3a";
const CREAM = "#f5f1e8";
const ORANGE = "#f26b1d";
const LINE = "#1b2b4d";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${CREAM};">${escapeHtml(
          block,
        ).replace(/\r?\n/g, "<br />")}</p>`,
    )
    .join("");
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

export function renderUpdateEmail(
  update: UpdateWithImages,
  siteUrl: string,
  options: { isTest?: boolean } = {},
): { subject: string; html: string; text: string } {
  const articleUrl = `${siteUrl}/updates/${update.slug}`;
  // Stable public image URL — not the expiring signed URL.
  const imageUrl =
    update.images.length > 0 ? `${siteUrl}/og/update/${update.slug}` : null;
  const imageAlt = update.images[0]?.altText ?? "";

  const published = formatDate(update.published_at);
  const replyTo = publishableContactEmail();

  const eventLine =
    update.category === "market-event"
      ? formatEventRange(update.event_start_at, update.event_end_at)
      : "";

  // In a real Broadcast Resend swaps this for a per-recipient link. In a test
  // send nobody is subscribed, so say so rather than shipping a dead link.
  const unsubscribeHtml = options.isTest
    ? `<span style="opacity:0.6;">[Unsubscribe link appears here in a real broadcast]</span>`
    : `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${CREAM};">Unsubscribe</a>`;
  const unsubscribeText = options.isTest
    ? "[Unsubscribe link appears here in a real broadcast]"
    : "Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}";

  const text = [
    update.title,
    published,
    "",
    eventLine,
    update.venue_name ?? "",
    update.venue_address ?? "",
    "",
    update.description,
    "",
    `Read it on the website: ${articleUrl}`,
    "",
    replyTo ? `Questions? Reply to this email or write to ${replyTo}.` : "",
    unsubscribeText,
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(update.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${NAVY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
      <p style="margin:0 0 20px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${ORANGE};font-weight:700;">
        Ali&rsquo;s Heat Crunch Delight
      </p>

      ${
        imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;margin:0 0 24px;" />`
          : ""
      }

      <h1 style="margin:0 0 8px;font-size:28px;line-height:1.25;color:${CREAM};">
        ${escapeHtml(update.title)}
      </h1>

      ${
        published
          ? `<p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ORANGE};">${escapeHtml(published)}</p>`
          : ""
      }

      ${
        eventLine
          ? `<div style="margin:0 0 20px;padding:14px 16px;background:${NAVY_SOFT};border-left:4px solid ${ORANGE};">
               <p style="margin:0;font-size:15px;line-height:1.5;color:${CREAM};font-weight:600;">${escapeHtml(eventLine)}</p>
               ${update.venue_name ? `<p style="margin:4px 0 0;font-size:14px;color:${CREAM};">${escapeHtml(update.venue_name)}</p>` : ""}
               ${update.venue_address ? `<p style="margin:2px 0 0;font-size:14px;color:${CREAM};opacity:0.75;">${escapeHtml(update.venue_address)}</p>` : ""}
             </div>`
          : ""
      }

      ${paragraphs(update.description)}

      <p style="margin:24px 0 0;">
        <a href="${escapeHtml(articleUrl)}"
           style="display:inline-block;background:${ORANGE};color:${NAVY};text-decoration:none;padding:13px 26px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;font-size:14px;">
          Read it on the website
        </a>
      </p>

      <hr style="border:none;border-top:1px solid ${LINE};margin:32px 0 16px;" />

      ${
        replyTo
          ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${CREAM};opacity:0.6;">
               Questions? Just reply, or write to
               <a href="mailto:${escapeHtml(replyTo)}" style="color:${CREAM};">${escapeHtml(replyTo)}</a>.
             </p>`
          : ""
      }

      <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${CREAM};opacity:0.5;">
        You&rsquo;re getting this because you confirmed a subscription to AHCD
        updates. ${unsubscribeHtml}
      </p>

      <!-- A business mailing address is legally required in marketing email.
           Not yet supplied and must not be invented; broadcasts stay disabled
           until it exists. -->
      <p style="margin:0;font-size:12px;color:${CREAM};opacity:0.35;">
        [Business mailing address required before broadcasting]
      </p>
    </div>
  </body>
</html>`;

  return { subject: update.title, html, text };
}
