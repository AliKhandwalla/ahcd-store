/**
 * Public product API.
 *
 * This barrel keeps every existing `@/lib/products` import working now that the
 * data lives in Supabase rather than a static array. Public components consume
 * the same `Product` shape they always did.
 *
 * See lib/products/types.ts for the Supabase / Square source-of-truth boundary.
 */

export type {
  MediaPadding,
  Product,
  ProductDetail,
  ProductImage,
  ProductVisibility,
} from "@/lib/products/types";

export {
  PRODUCT_VISIBILITIES,
  VISIBILITY_LABELS,
  isProductVisibility,
} from "@/lib/products/types";

export {
  getProduct,
  getProducts,
  getProductShareImage,
  getProductsExcept,
} from "@/lib/products/queries";

import type { Product } from "@/lib/products/types";

/**
 * The single place a price is formatted for display.
 *
 * When Square eventually owns pricing, this is where the value changes source.
 */
export function formatPrice(product: Pick<Product, "priceCents" | "currency">) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency,
  }).format(product.priceCents / 100);
}
