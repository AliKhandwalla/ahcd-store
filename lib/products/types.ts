/**
 * Product types.
 *
 * ---------------------------------------------------------------------------
 * SOURCE-OF-TRUTH BOUNDARY (mirrors the comment in the SQL migration)
 *
 *   Supabase owns WEBSITE EDITORIAL CONTENT:
 *     slug, name, summary, description, about, images, alt text,
 *     display order, visibility, informational details
 *
 *   Square will eventually own COMMERCIAL DATA:
 *     price, SKU, inventory, tax
 *
 * `priceCents` is the only field that migrates. It is read exclusively through
 * formatPrice(), so pointing prices at Square later means changing where that
 * one value comes from — not reworking the UI. Do not add a second price field
 * or cache Square prices here, or the two systems will disagree.
 *
 * No Square code exists in this project yet.
 * ---------------------------------------------------------------------------
 */

export type ProductImage = {
  /** Either a repo path (/images/…) or a signed Storage URL. */
  src: string;
  /** Intrinsic size, so next/image reserves the right space and never crops. */
  width: number;
  height: number;
  alt: string;
};

/** Extra factual information, rendered as a description list. Never a control. */
export type ProductDetail = {
  label: string;
  value: string;
};

/**
 * How tightly the image sits inside its media box. Images are always fitted
 * whole (never cropped); this only tunes the surrounding breathing room, since
 * a photo that already carries its own margins needs less than one that doesn't.
 */
export type MediaPadding = "tight" | "default";

/** The public view model. Unchanged from the pre-database version. */
export type Product = {
  slug: string;
  name: string;
  /** One short line used on cards and in metadata. */
  summary: string;
  description: string;
  /** Plain-spoken paragraph shown under "What it's like". Strictly factual. */
  about: string;
  priceCents: number;
  currency: "USD";
  /** null renders the branded placeholder. */
  image: ProductImage | null;
  mediaPadding: MediaPadding;
  details: ProductDetail[];
};

export const PRODUCT_VISIBILITIES = ["published", "hidden", "archived"] as const;
export type ProductVisibility = (typeof PRODUCT_VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  published: "Published",
  hidden: "Hidden",
  archived: "Archived",
};

export function isProductVisibility(
  value: unknown,
): value is ProductVisibility {
  return PRODUCT_VISIBILITIES.includes(value as ProductVisibility);
}

/** Where an image's bytes live. Repo images are preserved, not re-uploaded. */
export type ImageSource = "local" | "storage";

export type ProductImageRow = {
  id: string;
  product_id: string;
  source: ImageSource;
  path: string;
  alt_text: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  about: string;
  price_cents: number;
  currency: string;
  visibility: ProductVisibility;
  sort_order: number;
  media_padding: MediaPadding;
  details: ProductDetail[];
  created_at: string;
  updated_at: string;
};

/** Admin view: every visibility, with images resolved for preview. */
export type AdminProduct = ProductRow & {
  images: (ProductImageRow & { previewUrl: string })[];
};

/** Admin list row — image count without signing every URL. */
export type AdminProductSummary = ProductRow & {
  imageCount: number;
  thumbnailUrl: string | null;
};

/** What the editor submits per image when a product is saved. */
export type PendingProductImage = {
  source: ImageSource;
  path: string;
  altText: string;
  width: number | null;
  height: number | null;
};

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
