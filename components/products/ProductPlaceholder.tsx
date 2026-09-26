import Image from "next/image";
import { site } from "@/lib/site";

/**
 * Stand-in for a product that has not been photographed yet.
 *
 * Deliberately graphic rather than photographic: it uses the brand crest and
 * type on navy so it can never be mistaken for a picture of the real product.
 * The logo PNG's opaque background is exactly #030e29, so it sits seamlessly
 * on the navy panel.
 */
export default function ProductPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-navy px-6 text-center">
      <Image
        src="/images/ahcd-logo.png"
        alt=""
        width={1280}
        height={680}
        className="h-auto w-3/5 max-w-[14rem] opacity-90"
      />
      <p className="mt-4 text-[0.65rem] font-bold tracking-[0.2em] text-flame uppercase sm:text-xs">
        Photo coming soon
      </p>
      <p className="mt-1 text-[0.65rem] text-cream/50 sm:text-xs">
        {site.shortName}
      </p>
      <div className="flame-rule mt-5 h-1 w-16" aria-hidden="true" />
    </div>
  );
}
