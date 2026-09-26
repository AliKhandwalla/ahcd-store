import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import OrderingNotice from "@/components/products/OrderingNotice";
import ProductMedia from "@/components/products/ProductMedia";
import { requireAdmin } from "@/lib/admin/auth";
import { formatPrice, getProduct } from "@/lib/products";
import { getProductBySlugForAdmin } from "@/lib/products/admin-queries";
import type { Product } from "@/lib/products/types";

// Rendered on demand rather than prerendered, so an admin edit is live on the
// next page load with no redeploy and no cache to reason about.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product not found — Ali's Heat Crunch Delight" };
  }

  // Only published products resolve here, and the sharing route re-checks
  // independently, so a hidden product's photo can't leak into a preview.
  const images = product.image
    ? [`/og/product/${slug}`]
    : [
        {
          url: "/images/ahcd-logo.png",
          width: 1280,
          height: 680,
          alt: "The Ali's Heat Crunch Delight logo.",
        },
      ];

  const title = `${product.name} — Ali's Heat Crunch Delight`;

  return {
    title,
    description: product.description,
    openGraph: {
      title,
      description: product.description,
      type: "website",
      images,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  let product: Product | null = await getProduct(slug);
  let isPreview = false;

  // Admin-only preview of an unpublished product. The query parameter grants
  // nothing on its own — access is decided by the server-side admin check, so
  // for everyone else an unpublished slug still 404s.
  if (!product && preview) {
    const gate = await requireAdmin();
    if (gate.ok) {
      const record = await getProductBySlugForAdmin(slug);
      if (record) {
        isPreview = true;
        product = {
          slug: record.product.slug,
          name: record.product.name,
          summary: record.product.summary,
          description: record.product.description,
          about: record.product.about,
          priceCents: record.product.price_cents,
          currency: "USD",
          image: record.image,
          mediaPadding: record.product.media_padding,
          details: Array.isArray(record.product.details)
            ? record.product.details
            : [],
        };
      }
    }
  }

  if (!product) notFound();

  return (
    <article className="bg-navy">
      {isPreview && (
        <p className="bg-flame px-4 py-2 text-center text-sm font-bold tracking-wide text-navy uppercase">
          Preview — this product is not published
        </p>
      )}

      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <Link
          href="/products"
          className="text-xs font-bold tracking-[0.18em] text-cream/60 uppercase transition-colors hover:text-flame"
        >
          &larr; All products
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
          <div className="border border-navy-line">
            <ProductMedia
              product={product}
              sizes="(min-width: 1024px) 36rem, 92vw"
              priority
              className="aspect-[4/3] lg:aspect-square"
            />
          </div>

          <div>
            <h1 className="display-hed text-[clamp(2rem,7vw,3.5rem)] text-cream">
              {product.name}
            </h1>

            <p className="mt-4 text-cream">
              <span className="display-hed text-3xl text-flame sm:text-4xl">
                {formatPrice(product)}
              </span>{" "}
              <span className="text-sm text-cream/60 sm:text-base">
                in-person price
              </span>
            </p>

            <div className="flame-rule mt-6 h-1 w-24" aria-hidden="true" />

            <p className="mt-6 max-w-prose text-base leading-relaxed text-cream/85 sm:text-lg">
              {product.description}
            </p>

            {product.about && (
              <div className="mt-8 border-t border-navy-line pt-6">
                <h2 className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
                  What it&rsquo;s like
                </h2>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-cream/75">
                  {product.about}
                </p>
              </div>
            )}

            {product.details.length > 0 && (
              <dl className="mt-8 border-t border-navy-line pt-6">
                {product.details.map((detail) => (
                  <div
                    key={detail.label}
                    className="flex flex-wrap gap-x-3 gap-y-1"
                  >
                    <dt className="text-xs font-bold tracking-[0.18em] text-orange uppercase sm:text-sm">
                      {detail.label}
                    </dt>
                    <dd className="text-sm text-cream/85 sm:text-base">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-8">
              <OrderingNotice tone="dark" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
