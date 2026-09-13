import Link from "next/link";
import UpdateCard from "@/components/updates/UpdateCard";
import { listPublishedUpdates } from "@/lib/updates/queries";
import type { UpdateWithImages } from "@/lib/updates/types";

/**
 * Homepage strip of the newest published updates.
 *
 * The landing page must never depend on the database being reachable, so this
 * swallows its own failure and renders nothing. If Supabase is slow, erroring
 * or misconfigured, the rest of the homepage is unaffected — the section simply
 * isn't there.
 */
export default async function LatestUpdates() {
  let updates: UpdateWithImages[] = [];

  try {
    updates = await listPublishedUpdates(3);
  } catch {
    return null;
  }

  // Nothing published yet: stay out of the way rather than showing an empty box.
  if (updates.length === 0) return null;

  return (
    <section aria-labelledby="latest-updates-heading" className="bg-navy">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
              From AHCD
            </p>
            <h2
              id="latest-updates-heading"
              className="display-hed mt-3 text-[clamp(2rem,7vw,3.5rem)] text-cream"
            >
              Latest updates
            </h2>
          </div>
          <Link
            href="/updates"
            className="text-sm font-bold tracking-[0.14em] text-flame uppercase transition-colors hover:text-orange"
          >
            All updates &rarr;
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:gap-8 lg:grid-cols-3">
          {updates.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>
      </div>
    </section>
  );
}
