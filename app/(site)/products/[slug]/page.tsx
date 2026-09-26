import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import OrderingNotice from "@/components/products/OrderingNotice";
import ProductMedia from "@/components/products/ProductMedia";
import { formatPrice, getProduct, getProducts } from "@/lib/products";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

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

  // Products without a photograph fall back to the brand crest rather than
  // another product's photo, which would misrepresent what they look like.
  const image = product.image
    ? {
        url: product.image.src,
        width: product.image.width,
        height: product.image.height,
        alt: product.image.alt,
      }
    : {
        url: "/images/ahcd-logo.png",
        width: 1280,
        height: 680,
        alt: "The Ali's Heat Crunch Delight logo.",
      };

  return {
    title: `${product.name} — Ali's Heat Crunch Delight`,
    description: product.description,
    openGraph: {
      title: `${product.name} — Ali's Heat Crunch Delight`,
      description: product.description,
      type: "website",
      images: [image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  return (
    <article className="bg-navy">
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

            <div className="mt-8 border-t border-navy-line pt-6">
              <h2 className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
                What it&rsquo;s like
              </h2>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-cream/75">
                {product.about}
              </p>
            </div>

            {product.details.length > 0 && (
              <dl className="mt-8 border-t border-navy-line pt-6">
                {product.details.map((detail) => (
                  <div key={detail.label} className="flex flex-wrap gap-x-3 gap-y-1">
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
