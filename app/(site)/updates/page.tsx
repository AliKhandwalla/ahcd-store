import type { Metadata } from "next";
import UpdateCard from "@/components/updates/UpdateCard";
import { listPublishedUpdates } from "@/lib/updates/queries";

export const metadata: Metadata = {
  title: "Updates — Ali's Heat Crunch Delight",
  description:
    "News and updates from Ali's Heat Crunch Delight, a homemade chilli oil made in small batches.",
};

export default async function UpdatesPage() {
  const updates = await listPublishedUpdates();

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
          New batches, new places to find us, and whatever else is happening.
        </p>

        <div className="flame-rule mt-8 h-1 w-full" aria-hidden="true" />

        {updates.length === 0 ? (
          <p className="mt-12 border border-navy-line bg-navy-soft px-6 py-10 text-center text-cream/70">
            No updates yet — check back soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:gap-8 lg:grid-cols-2">
            {updates.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
