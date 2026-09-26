import Link from "next/link";
import ProductMedia from "@/components/products/ProductMedia";
import { formatPrice, type Product } from "@/lib/products";

/**
 * Catalogue card. The product name carries the only link, so the card exposes
 * one clear target to keyboard and screen-reader users rather than several
 * duplicates pointing at the same page.
 */
export default function ProductCard({
  product,
  headingLevel = "h2",
}: {
  product: Product;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <article className="group flex flex-col border border-navy-line bg-navy-soft">
      <ProductMedia
        product={product}
        sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 92vw"
      />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <Heading className="display-hed text-xl text-cream sm:text-2xl">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors hover:text-flame"
          >
            {product.name}
          </Link>
        </Heading>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/75">
          {product.summary}
        </p>

        <p className="mt-4 text-sm text-cream">
          <span className="display-hed text-xl text-flame sm:text-2xl">
            {formatPrice(product)}
          </span>{" "}
          <span className="text-cream/60">in-person price</span>
        </p>

        <span
          aria-hidden="true"
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-orange uppercase transition-colors group-hover:text-flame"
        >
          View details &rarr;
        </span>
      </div>
    </article>
  );
}
