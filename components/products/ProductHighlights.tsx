import Link from "next/link";
import ProductMedia from "@/components/products/ProductMedia";
import { formatPrice, getProductsExcept } from "@/lib/products";

/**
 * Compact "Also from AHCD" row for the homepage.
 *
 * Deliberately smaller than a catalogue card — image, name, price, nothing
 * else — so the homepage points at /products rather than reproducing it. The
 * ordering notice is not repeated here; the product section above already
 * carries it once.
 */
export default async function ProductHighlights() {
  const products = await getProductsExcept("original");

  if (products.length === 0) return null;

  return (
    <div className="mt-14 border-t border-ink/10 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-xs font-bold tracking-[0.22em] text-orange-deep uppercase sm:text-sm">
          Also from AHCD
        </h3>
        <Link
          href="/products"
          className="text-sm font-bold tracking-[0.14em] text-navy uppercase underline underline-offset-8 transition-colors hover:text-orange-deep"
        >
          View all products &rarr;
        </Link>
      </div>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 sm:gap-6">
        {products.map((product) => (
          <li key={product.slug}>
            <Link
              href={`/products/${product.slug}`}
              className="group flex items-center gap-4 border border-ink/12 bg-white p-3 transition-colors hover:border-orange sm:gap-5 sm:p-4"
            >
              <div className="w-24 shrink-0 sm:w-28">
                <ProductMedia
                  product={product}
                  sizes="7rem"
                  className="aspect-square"
                />
              </div>

              <div className="min-w-0">
                <p className="display-hed text-lg text-navy transition-colors group-hover:text-orange-deep sm:text-xl">
                  {product.name}
                </p>
                <p className="mt-1 text-sm text-ink/70">
                  {formatPrice(product)}{" "}
                  <span className="text-ink/50">in person</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
