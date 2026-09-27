import type { NextConfig } from "next";

/**
 * The Supabase project origin, needed by the browser for auth and REST calls
 * and for signed Storage image URLs. Derived from the public environment
 * variable so the origin is stated once.
 */
const SUPABASE_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    if (raw) return new URL(raw).origin;
  } catch {
    // Fall through to the known project origin below.
  }
  return "https://yvczbsjlgebyhkhievyn.supabase.co";
})();

/**
 * Content Security Policy.
 *
 * HONEST LIMITATION: script-src includes 'unsafe-inline'. Next.js injects
 * inline bootstrap and streaming scripts, and the strict alternative is a
 * per-request nonce, which needs middleware and is the subject of its own
 * Next advisory. This policy therefore does not stop injected inline script.
 *
 * It is still worth having: it blocks script from any other origin, stops the
 * site being framed, pins form submissions and <base>, and forbids plugins.
 * The site renders no user-supplied HTML, so the residual XSS surface is
 * small. Moving to nonces is the obvious next hardening step.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  // Tailwind and next/font inject style tags; there is no nonce-free
  // alternative for these.
  "style-src 'self' 'unsafe-inline'",
  // data: and blob: cover Next's image placeholders and optimiser output.
  `img-src 'self' data: blob: https://lh3.googleusercontent.com ${SUPABASE_ORIGIN}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} wss://${new URL(SUPABASE_ORIGIN).host}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors for modern browsers, kept for older ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site asks for none of these, so deny them outright.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Discloses the framework and version to anyone scanning. No benefit to us.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        // Google account avatars returned in Supabase user_metadata.avatar_url.
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        // Signed URLs for update images in the private Supabase Storage bucket.
        protocol: "https",
        hostname: "yvczbsjlgebyhkhievyn.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
