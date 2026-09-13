import Image from "next/image";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-navy">
      {/* Soft warm glow behind the product, so the photo reads as placed rather than pasted. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-0 h-[38rem] w-[38rem] -translate-y-1/2 translate-x-1/3 rounded-full bg-orange/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8 lg:py-24">
        <div className="lg:col-span-6">
          <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
            Small-batch chilli crunch
          </p>

          <h1 className="display-hed mt-4 text-[clamp(3rem,13vw,7rem)] text-cream">
            {"Crunch with "}
            <br />
            {"a kick."}
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-cream/80 sm:text-lg">
            Ali&rsquo;s Heat Crunch Delight is a homemade chilli oil, made in
            small batches. Spoon it over whatever you&rsquo;re already eating.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <a
              href="#shop"
              className="inline-flex items-center justify-center rounded-sm bg-orange px-8 py-4 text-base font-bold tracking-wide text-navy uppercase transition-colors hover:bg-flame"
            >
              Shop Now
            </a>
            <a
              href="#story"
              className="group inline-flex items-center justify-center gap-2 rounded-sm border border-cream/25 px-8 py-4 text-base font-bold tracking-wide text-cream uppercase transition-colors hover:border-flame hover:text-flame"
            >
              Our Story
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          {/* The product photo is 1280x617 (2.07:1). It is framed at its own
              aspect ratio so neither the jar nor the logo lid is ever cropped. */}
          <figure className="border border-navy-line bg-cream p-3 shadow-2xl shadow-black/40 sm:p-4">
            <div className="relative aspect-[1280/617] w-full">
              <Image
                src="/images/ahcd-product-jar.jpg"
                alt="A jar of Ali's Heat Crunch Delight chilli oil next to its lid, which shows the AHCD logo label."
                fill
                priority
                sizes="(min-width: 1024px) 46rem, (min-width: 640px) 90vw, 94vw"
                className="object-contain"
              />
            </div>
            <figcaption className="mt-3 flex flex-col gap-1 border-t border-ink/10 pt-3 text-[0.7rem] font-bold tracking-[0.18em] text-ink/70 uppercase sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-xs">
              <span>Ali&rsquo;s Heat Crunch Delight</span>
              <span className="text-orange-deep">Homemade chilli oil</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
