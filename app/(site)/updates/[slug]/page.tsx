import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryBadge from "@/components/updates/CategoryBadge";
import EventDetails from "@/components/updates/EventDetails";
import UpdateBody from "@/components/updates/UpdateBody";
import { excerpt, formatPublished } from "@/components/updates/UpdateCard";
import UpdateGallery from "@/components/updates/UpdateGallery";
import { getPublishedUpdateBySlug } from "@/lib/updates/queries";
import { isEventExpired } from "@/lib/updates/time";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const update = await getPublishedUpdateBySlug(slug);

  if (!update) return { title: "Update not found — Ali's Heat Crunch Delight" };

  const title = `${update.title} — Ali's Heat Crunch Delight`;
  const description = excerpt(update.description, 155);

  // Only published updates reach this point (getPublishedUpdateBySlug filters
  // on status), and the sharing route re-checks independently, so a draft image
  // can never end up in a preview. Omitted entirely when there is no image, so
  // the site-wide default applies rather than a broken URL.
  const images = update.images.length > 0 ? [`/og/update/${update.slug}`] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: update.published_at ?? undefined,
      images,
    },
  };
}

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Returns null for drafts as well as misses, so an unpublished update 404s
  // rather than leaking through a guessed URL.
  const update = await getPublishedUpdateBySlug(slug);
  if (!update) notFound();

  return (
    <article className="bg-navy">
      <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <Link
          href="/updates"
          className="text-xs font-bold tracking-[0.18em] text-cream/60 uppercase transition-colors hover:text-flame"
        >
          &larr; All updates
        </Link>

        <div className="mt-8">
          <CategoryBadge
            category={update.category}
            past={
              update.category === "market-event" &&
              isEventExpired(update.event_start_at, update.event_end_at)
            }
          />
        </div>

        {update.published_at && (
          <p className="mt-4 text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
            <time dateTime={update.published_at}>
              {formatPublished(update.published_at)}
            </time>
          </p>
        )}

        <h1 className="display-hed mt-3 text-[clamp(2.25rem,8vw,4rem)] text-cream">
          {update.title}
        </h1>

        <div className="flame-rule mt-8 h-1 w-full" aria-hidden="true" />

        {update.category === "market-event" && <EventDetails update={update} />}

        <div className="mt-10">
          <UpdateBody text={update.description} />
        </div>

        <UpdateGallery images={update.images} />

        <div className="mt-14 border-t border-navy-line pt-8">
          <Link
            href="/updates"
            className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] text-flame uppercase transition-colors hover:text-orange"
          >
            &larr; Back to updates
          </Link>
        </div>
      </div>
    </article>
  );
}
