import Image from "next/image";
import ProductPlaceholder from "@/components/products/ProductPlaceholder";
import type { Product } from "@/lib/products";

const PADDING: Record<Product["mediaPadding"], string> = {
  tight: "p-2 sm:p-3",
  default: "p-4 sm:p-6",
};

/**
 * Fixed-ratio media frame shared by cards and detail pages.
 *
 * The three products have very different shapes — the jar is 2.07:1 landscape,
 * the shirt 0.75:1 portrait — so images are fitted whole (object-contain) on a
 * white surface. Nothing is ever cropped or stretched, and the grid still lines
 * up. Per-product padding tunes how much breathing room each one gets, because
 * fitting an image correctly is not the same as framing it well.
 */
export default function ProductMedia({
  product,
  sizes,
  priority = false,
  className = "aspect-[4/3]",
}: {
  product: Product;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!product.image) {
    return (
      <div className={`relative w-full overflow-hidden ${className}`}>
        <ProductPlaceholder />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-white ${PADDING[product.mediaPadding]} ${className}`}
    >
      <Image
        src={product.image.src}
        alt={product.image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain"
      />
    </div>
  );
}
