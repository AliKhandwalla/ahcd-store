import Image from "next/image";
import { site } from "@/lib/site";

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

          <div className="mt-8 border-l-4 border-orange bg-white p-5 shadow-sm sm:p-6">
            <p className="display-hed text-2xl text-navy sm:text-3xl">
              Online ordering coming soon
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink/75 sm:text-base">
              The shop isn&rsquo;t open yet. Until it is, follow along on
              Instagram for new batches and updates.
            </p>
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-sm bg-navy px-6 py-3.5 text-sm font-bold tracking-wide text-cream uppercase transition-colors hover:bg-orange hover:text-navy"
            >
              Follow on Instagram
              <span aria-hidden="true">&rarr;</span>
            </a>
            <p className="mt-3 text-xs tracking-wide text-ink/55 sm:text-sm">
              {site.instagramHandle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
