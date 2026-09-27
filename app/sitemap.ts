import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { siteOrigin } from "@/lib/site-url";
import { listPublishedUpdates } from "@/lib/updates/queries";

/**
 * Only public, indexable pages. Products and updates come from the database,
 * which already returns published rows only, so nothing draft or hidden can
 * reach the sitemap.
 *
 * If either query fails the sitemap degrades to the static pages rather than
 * failing the request — a partial sitemap is better than a 500.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/products`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/updates`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${origin}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [products, updates] = await Promise.all([
    getProducts().catch(() => []),
    listPublishedUpdates().catch(() => []),
  ]);

  return [
    ...staticPages,
    ...products.map((product) => ({
      url: `${origin}/products/${product.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...updates.map((update) => ({
      url: `${origin}/updates/${update.slug}`,
      lastModified: update.published_at ? new Date(update.published_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
