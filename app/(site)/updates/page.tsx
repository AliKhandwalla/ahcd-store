import type { Metadata } from "next";
import CategoryFilter from "@/components/updates/CategoryFilter";
import FeaturedUpdate from "@/components/updates/FeaturedUpdate";
import UpdateCard from "@/components/updates/UpdateCard";
import { getFeaturedUpdate, listPublishedUpdates } from "@/lib/updates/queries";
import {
  CATEGORY_LABELS,
  isUpdateCategory,
  type UpdateCategory,
} from "@/lib/updates/types";

export const metadata: Metadata = {
  title: "Updates — Ali's Heat Crunch Delight",
  description:
    "Market appearances, new flavours and announcements from Ali's Heat Crunch Delight, a homemade chilli oil made in small batches.",
};

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: raw } = await searchParams;

  // An unrecognised value degrades to "all" rather than erroring.
  const active: UpdateCategory | null = isUpdateCategory(raw) ? raw : null;

  const [updates, featured] = await Promise.all([
    listPublishedUpdates(undefined, active ?? undefined),
    // The featured block is a promotion, so it only belongs on the unfiltered
    // view — a filtered list should show exactly what was asked for.
    active ? Promise.resolve(null) : getFeaturedUpdate(),
  ]);

  // Avoid showing the featured post twice in a row.
  const rest = featured
    ? updates.filter((update) => update.id !== featured.id)
    : updates;

  return (
    <section className="bg-navy">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
          From AHCD
        </p>
        <h1 className="display-hed mt-3 text-[clamp(2.5rem,9vw,4.5rem)] text-cream">
          Updates
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">
          Markets we&rsquo;ll be at, new batches, and everything else happening
          at AHCD.
        </p>

        <div className="flame-rule mt-8 h-1 w-full" aria-hidden="true" />

        <CategoryFilter active={active} />

        {featured && <FeaturedUpdate update={featured} />}

        {rest.length === 0 ? (
          <p className="mt-10 border border-navy-line bg-navy-soft px-6 py-10 text-center text-cream/70">
            {active
              ? `No ${CATEGORY_LABELS[active].toLowerCase()} updates yet.`
              : "No updates yet — check back soon."}
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:gap-8 lg:grid-cols-2">
            {rest.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
