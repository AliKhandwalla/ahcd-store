import Image from "next/image";
import { site } from "@/lib/site";

export default function StorySection() {
  return (
    <section id="story" className="bg-navy">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-14 lg:px-8">
        {/* Source is 1280x1707 portrait: Ali's face sits at the top of the frame
            and the stacked jars fill the bottom. A landscape crop would lose one
            or the other, so this stays portrait at every breakpoint. */}
        <figure className="mx-auto w-full max-w-md lg:col-span-5 lg:mx-0 lg:max-w-none">
          <div className="relative aspect-[3/4] w-full overflow-hidden border-4 border-cream shadow-2xl shadow-black/50">
            <Image
              src="/images/ali-founder-with-jar.jpg"
              alt="Ali smiling at a kitchen counter behind a stack of jars of Ali's Heat Crunch Delight chilli oil."
              fill
              sizes="(min-width: 1024px) 32rem, (min-width: 640px) 28rem, 94vw"
              className="object-cover object-center"
            />
          </div>
        </figure>

        <div className="lg:col-span-7">
          <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
            From Ali&rsquo;s kitchen
          </p>

          <h2 className="display-hed mt-3 text-[clamp(2.5rem,9vw,4.5rem)] text-cream">
            Meet Ali.
          </h2>

          <div className="mt-6 max-w-prose space-y-4 text-base leading-relaxed text-cream/80 sm:text-lg">
            <p>
              {site.name} is a homemade chilli oil brand created by Ali. Every
              jar is made in small batches and packed by hand.
            </p>
            <p>
              A few jars at a time, filled and labelled one by one.
            </p>
          </div>

          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] text-flame uppercase underline decoration-flame/40 underline-offset-8 transition-colors hover:text-orange sm:text-base"
          >
            Follow along on Instagram
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
