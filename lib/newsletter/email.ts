import "server-only";

/**
 * The double opt-in confirmation email.
 *
 * Plain, table-free HTML with inline styles — email clients are unreliable
 * with modern CSS. Brand colours match the site's tokens. A text alternative
 * is always sent alongside.
 */

const NAVY = "#030e29";
const CREAM = "#f5f1e8";
const ORANGE = "#f26b1d";

export function confirmationEmail(confirmUrl: string) {
  const subject = "Confirm your AHCD updates";

  const text = [
    "Confirm your subscription to Ali's Heat Crunch Delight",
    "",
    "Tap the link below to start getting occasional updates on where to find us,",
    "new flavours, and what's next for AHCD:",
    "",
    confirmUrl,
    "",
    "This link expires in 24 hours and can only be used once.",
    "",
    "If you didn't ask for this, you can ignore this email — nothing will happen",
    "and you won't be added to anything.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${NAVY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${ORANGE};font-weight:700;">
        Ali&rsquo;s Heat Crunch Delight
      </p>

      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:${CREAM};">
        Confirm your subscription
      </h1>

      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${CREAM};opacity:0.85;">
        Tap the button below to start getting occasional updates on where to
        find us, new flavours, and what&rsquo;s next for AHCD.
      </p>

      <p style="margin:0 0 24px;">
        <a href="${confirmUrl}"
           style="display:inline-block;background:${ORANGE};color:${NAVY};text-decoration:none;padding:14px 28px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;font-size:15px;">
          Confirm subscription
        </a>
      </p>

      <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:${CREAM};opacity:0.6;">
        Or paste this into your browser:<br />
        <span style="word-break:break-all;">${confirmUrl}</span>
      </p>

      <hr style="border:none;border-top:1px solid #1b2b4d;margin:28px 0;" />

      <p style="margin:0;font-size:13px;line-height:1.6;color:${CREAM};opacity:0.55;">
        This link expires in 24 hours and can only be used once. If you
        didn&rsquo;t ask for this, ignore this email &mdash; nothing will
        happen and you won&rsquo;t be added to anything.
      </p>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}
