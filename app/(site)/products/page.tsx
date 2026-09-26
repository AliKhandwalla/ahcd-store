import type { Metadata } from "next";
import OrderingNotice from "@/components/products/OrderingNotice";
import ProductCard from "@/components/products/ProductCard";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Products — Ali's Heat Crunch Delight",
  description:
    "The AHCD range: the original homemade chilli oil, Mediterranean Crunch, and the official AHCD T-shirt. Sold in person — online ordering coming soon.",
  openGraph: {
    title: "Products — Ali's Heat Crunch Delight",
    description:
      "The AHCD range: the original homemade chilli oil, Mediterranean Crunch, and the official AHCD T-shirt.",
    type: "website",
    images: [
      {
        url: "/images/ahcd-product-jar.jpg",
        width: 1280,
        height: 617,
        alt: "A jar of Ali's Heat Crunch Delight chilli oil beside its labelled lid.",
      },
    ],
  },
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <section className="bg-navy">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
          The range
        </p>
        <h1 className="display-hed mt-3 text-[clamp(2.5rem,9vw,4.5rem)] text-cream">
          Products
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">
          Everything AHCD makes, made in small batches. Prices are what
          you&rsquo;ll pay in person.
        </p>

        <div className="flame-rule mt-8 h-1 w-full" aria-hidden="true" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>

        <div className="mt-12 max-w-2xl">
          <OrderingNotice tone="dark" />
        </div>
      </div>
    </section>
  );
}
