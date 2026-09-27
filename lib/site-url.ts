/**
 * The site's public origin.
 *
 * NEXT_PUBLIC_SITE_URL is stored as a bare host (no protocol), matching how
 * it is set in Vercel, so the scheme is added here. An unset value falls back
 * to the live domain rather than to localhost: a wrong-but-live origin in a
 * confirmation email is recoverable, whereas a localhost link is not.
 */
export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return "https://alisheatcrunchdelight.com";
  return /^https?:\/\//.test(configured)
    ? configured.replace(/\/$/, "")
    : `https://${configured.replace(/\/$/, "")}`;
}
