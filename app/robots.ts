import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";

/**
 * Search engines are welcome on the shop and the updates, and nowhere else.
 *
 * The disallowed paths already send `noindex` in their own metadata; this
 * stops well-behaved crawlers requesting them at all. It is not a security
 * control — those routes are gated server-side — just good manners and a
 * smaller crawl surface.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/account", "/auth/", "/newsletter/confirm"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
