import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  PRODUCT_IMAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  type AdminProduct,
  type AdminProductSummary,
  type ProductImageRow,
  type ProductRow,
} from "@/lib/products/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Renderable URL for an image in the admin, regardless of visibility.
 *
 * The admin storage policy allows reading every object in the bucket, so
 * hidden and archived products still preview correctly here — unlike the
 * public path, which only signs images of published products.
 */
async function signForAdmin(
  supabase: SupabaseClient,
  rows: ProductImageRow[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  for (const row of rows) {
    if (row.source === "local") urls.set(row.id, row.path);
  }

  const storageRows = rows.filter((row) => row.source === "storage");
  if (storageRows.length === 0) return urls;

  const { data } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUrls(
      storageRows.map((row) => row.path),
      SIGNED_URL_TTL_SECONDS,
    );

  const byPath = new Map<string, string>();
  (data ?? []).forEach((entry) => {
    if (entry.signedUrl && entry.path) byPath.set(entry.path, entry.signedUrl);
  });

  for (const row of storageRows) {
    urls.set(row.id, byPath.get(row.path) ?? "");
  }

  return urls;
}

/** Every product, any visibility. RLS grants this only to the admin. */
export async function listAllProducts(): Promise<AdminProductSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(id, source, path, sort_order)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  type Joined = ProductRow & {
    product_images: Pick<ProductImageRow, "id" | "source" | "path" | "sort_order">[];
  };

  const rows = data as Joined[];

  // Thumbnails: local paths render directly; storage thumbs are signed in one
  // batch rather than per row.
  const storageThumbs = rows
    .map((row) => [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0])
    .filter((image): image is NonNullable<typeof image> => Boolean(image))
    .filter((image) => image.source === "storage");

  const signed = new Map<string, string>();
  if (storageThumbs.length > 0) {
    const { data: signedData } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .createSignedUrls(
        storageThumbs.map((image) => image.path),
        SIGNED_URL_TTL_SECONDS,
      );
    (signedData ?? []).forEach((entry) => {
      if (entry.signedUrl && entry.path) signed.set(entry.path, entry.signedUrl);
    });
  }

  return rows.map(({ product_images, ...product }) => {
    const images = [...(product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const first = images[0];
    const thumbnailUrl = !first
      ? null
      : first.source === "local"
        ? first.path
        : (signed.get(first.path) ?? null);

    return { ...product, imageCount: images.length, thumbnailUrl };
  });
}

/** One product with its images, for the edit form. */
export async function getProductForEdit(
  id: string,
): Promise<AdminProduct | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const product = data as ProductRow;

  const { data: imageData } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  const rows = (imageData ?? []) as ProductImageRow[];
  const urls = await signForAdmin(supabase, rows);

  return {
    ...product,
    images: rows.map((row) => ({ ...row, previewUrl: urls.get(row.id) ?? "" })),
  };
}

/** Any-visibility lookup by slug, used by the admin-only preview. */
export async function getProductBySlugForAdmin(slug: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;
  const product = data as ProductRow;

  const { data: imageData } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true });

  const rows = (imageData ?? []) as ProductImageRow[];
  const urls = await signForAdmin(supabase, rows);
  const first = rows[0];

  return {
    product,
    image: first
      ? {
          src: urls.get(first.id) ?? "",
          width: first.width ?? 1200,
          height: first.height ?? 1200,
          alt: first.alt_text ?? "",
        }
      : null,
  };
}

/** Counts for the dashboard. */
export async function getProductStats() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("id, name, visibility, updated_at")
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as Pick<
    ProductRow,
    "id" | "name" | "visibility" | "updated_at"
  >[];

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return {
    total: rows.length,
    published: rows.filter((row) => row.visibility === "published").length,
    hidden: rows.filter((row) => row.visibility === "hidden").length,
    archived: rows.filter((row) => row.visibility === "archived").length,
    recentlyUpdated: rows.filter(
      (row) => new Date(row.updated_at).getTime() >= thirtyDaysAgo,
    ).length,
    recent: rows.slice(0, 5),
  };
}
