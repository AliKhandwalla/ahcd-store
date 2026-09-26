import { createClient } from "@/lib/supabase/server";
import { FALLBACK_PRODUCTS } from "@/lib/products/fallback";
import {
  PRODUCT_IMAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  type Product,
  type ProductImage,
  type ProductImageRow,
  type ProductRow,
} from "@/lib/products/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolves an image row to something renderable.
 *
 * Repo images ('local') are served straight from /public. Uploaded images
 * ('storage') live in a private bucket and need a short-lived signed URL, which
 * Storage RLS only grants while the parent product is published.
 */
async function resolveImages(
  supabase: SupabaseClient,
  rows: ProductImageRow[],
): Promise<Map<string, ProductImage>> {
  const resolved = new Map<string, ProductImage>();
  if (rows.length === 0) return resolved;

  const storageRows = rows.filter((row) => row.source === "storage");
  const signedByPath = new Map<string, string>();

  if (storageRows.length > 0) {
    const { data } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .createSignedUrls(
        storageRows.map((row) => row.path),
        SIGNED_URL_TTL_SECONDS,
      );

    (data ?? []).forEach((entry) => {
      if (entry.signedUrl && entry.path) {
        signedByPath.set(entry.path, entry.signedUrl);
      }
    });
  }

  for (const row of rows) {
    const src =
      row.source === "local" ? row.path : signedByPath.get(row.path);
    // A storage image that failed to sign is dropped rather than rendered broken.
    if (!src) continue;

    resolved.set(row.id, {
      src,
      // next/image needs numbers; fall back to a square if dimensions are absent.
      width: row.width ?? 1200,
      height: row.height ?? 1200,
      alt: row.alt_text ?? "",
    });
  }

  return resolved;
}

function toProduct(
  row: ProductRow,
  image: ProductImage | null,
): Product {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    about: row.about,
    priceCents: row.price_cents,
    currency: "USD",
    image,
    mediaPadding: row.media_padding,
    details: Array.isArray(row.details) ? row.details : [],
  };
}

async function loadPublished(): Promise<Product[]> {
  const supabase = await createClient();

  // RLS already hides non-published rows; the filter is defence in depth.
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("visibility", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("products query failed");
  const rows = (data ?? []) as ProductRow[];
  if (rows.length === 0) return [];

  const { data: imageData } = await supabase
    .from("product_images")
    .select("*")
    .in(
      "product_id",
      rows.map((row) => row.id),
    )
    .order("sort_order", { ascending: true });

  const imageRows = (imageData ?? []) as ProductImageRow[];
  const resolved = await resolveImages(supabase, imageRows);

  return rows.map((row) => {
    const first = imageRows.find((image) => image.product_id === row.id);
    return toProduct(row, first ? (resolved.get(first.id) ?? null) : null);
  });
}

/**
 * Published products in display order.
 *
 * Falls back to the built-in list if the database is unreachable, so a blip
 * never empties the storefront. The fallback is emergency-only — see
 * lib/products/fallback.ts.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const products = await loadPublished();
    // An empty table is a real answer (everything hidden); an error is not.
    return products;
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    const products = await loadPublished();
    return products.find((product) => product.slug === slug) ?? null;
  } catch {
    return FALLBACK_PRODUCTS.find((product) => product.slug === slug) ?? null;
  }
}

/** Everything except the given slug — used for the homepage's compact row. */
export async function getProductsExcept(slug: string): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((product) => product.slug !== slug);
}

/** Storage path of a published product's first image, for the sharing route. */
export async function getProductShareImage(
  slug: string,
): Promise<{ source: "local" | "storage"; path: string } | null> {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .eq("visibility", "published")
    .maybeSingle();

  if (!product) return null;

  const { data } = await supabase
    .from("product_images")
    .select("source, path")
    .eq("product_id", (product as { id: string }).id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as { source: "local" | "storage"; path: string } | null) ?? null;
}
