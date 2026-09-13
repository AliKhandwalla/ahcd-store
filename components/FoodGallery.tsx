import Image from "next/image";

export default function FoodGallery() {
  return (
    <section aria-labelledby="serving-heading" className="bg-cream text-ink">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.22em] text-orange-deep uppercase sm:text-sm">
            Serving suggestions
          </p>
          <h2
            id="serving-heading"
            className="display-hed mt-3 text-[clamp(2.5rem,9vw,5rem)] text-navy"
          >
            Put it on everything.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink/75 sm:text-lg">
            Made for the meals you already love.
          </p>
        </div>
      </div>

      {/* This photo (1222x880) holds TWO dishes side by side — a noodle bowl on
          the left and a sushi plate on the right. It stays near its native ratio
          on small screens and only loses tablecloth at the top and bottom on
          desktop, so both dishes always survive the crop. */}
      <figure className="mt-10 sm:mt-12">
        <div className="relative aspect-[1222/880] w-full sm:aspect-[16/9]">
          <Image
            src="/images/ahcd-tikka-ramen.png"
            alt="An overhead shot of two dishes: a noodle bowl topped with a fried egg, shredded chicken and chilli oil, beside a plate of sushi rolls and cucumber slices drizzled with chilli oil."
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <figcaption className="mx-auto max-w-7xl px-4 pt-3 text-xs tracking-wide text-ink/60 sm:px-6 sm:text-sm lg:px-8">
          Noodles, eggs, sushi and cucumbers &mdash; each finished with AHCD.
        </figcaption>
      </figure>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mt-10 grid items-start gap-6 sm:mt-12 sm:grid-cols-2 sm:gap-8">
          {/* Square source (1594x1602). Nudged down slightly so the bowl centres
              and the plant stays in the corner. */}
          <figure>
            <div className="relative aspect-square w-full overflow-hidden border border-ink/10">
              <Image
                src="/images/achd-eggs-and-rice.png"
                alt="Three fried eggs over steamed rice in a blue floral bowl, drizzled with Ali's Heat Crunch Delight chilli oil."
                fill
                sizes="(min-width: 640px) 42vw, 94vw"
                className="object-cover object-[50%_55%]"
              />
            </div>
            <figcaption className="pt-3 text-xs tracking-wide text-ink/60 sm:text-sm">
              Fried eggs and rice.
            </figcaption>
          </figure>

          {/* 1154x880 (1.31). Shown at 4:3 — almost its native ratio — and
              anchored left so the AHCD jar at the frame's edge is never cut. */}
          <figure>
            <div className="relative aspect-[4/3] w-full overflow-hidden border border-ink/10">
              <Image
                src="/images/ahcd-avocado-egg-toast.png"
                alt="A plate of toast topped with microgreens, a fried egg and a spoonful of Ali's Heat Crunch Delight, with a jar of the chilli oil beside the plate."
                fill
                sizes="(min-width: 640px) 42vw, 94vw"
                className="object-cover object-left"
              />
            </div>
            <figcaption className="pt-3 text-xs tracking-wide text-ink/60 sm:text-sm">
              Toast, greens and a jar within reach.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
