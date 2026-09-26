import Image from "next/image";
import Link from "next/link";
import OrderingNotice from "@/components/products/OrderingNotice";
import ProductHighlights from "@/components/products/ProductHighlights";

export default function ProductSection() {
  return (
    <section id="shop" className="bg-cream text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-8">
        {/* Same 2.07:1 product photo, again framed at its native ratio. */}
        <div className="border border-ink/12 bg-white p-3 shadow-xl shadow-ink/10 sm:p-5">
          <div className="relative aspect-[1280/617] w-full">
            <Image
              src="/images/ahcd-product-jar.jpg"
              alt="A jar of Ali's Heat Crunch Delight chilli oil filled with chilli flakes in oil, shown beside its labelled lid."
              fill
              sizes="(min-width: 1024px) 38rem, (min-width: 640px) 90vw, 94vw"
              className="object-contain"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold tracking-[0.22em] text-orange-deep uppercase sm:text-sm">
            The jar
          </p>

          <h2 className="display-hed mt-3 text-[clamp(2.25rem,7vw,3.75rem)] text-navy">
            Ali&rsquo;s Heat Crunch Delight
          </h2>

          <p className="mt-5 max-w-prose text-base leading-relaxed text-ink/80 sm:text-lg">
            A homemade chilli oil, made in small batches and hand-packed into
            glass jars. Crisp, crunchy chilli suspended in oil &mdash; built to
            go on top of the food you already cook.
          </p>

          <p className="mt-5 text-base text-ink/80 sm:text-lg">
            <Link
              href="/products/original"
              className="font-bold text-orange-deep underline underline-offset-8 transition-colors hover:text-orange"
            >
              See product details &rarr;
            </Link>
          </p>

          {/* Shared with /products and every detail page, so the wording can
              never drift between them. */}
          <div className="mt-8">
            <OrderingNotice />
          </div>
        </div>
      </div>

      {/* Compact pointer to the rest of the range — deliberately not a second
          copy of /products. */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <ProductHighlights />
      </div>
    </section>
  );
}
