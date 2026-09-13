import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UpdateBody from "@/components/updates/UpdateBody";
import { excerpt, formatPublished } from "@/components/updates/UpdateCard";
import UpdateGallery from "@/components/updates/UpdateGallery";
import { getPublishedUpdateBySlug } from "@/lib/updates/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const update = await getPublishedUpdateBySlug(slug);

  if (!update) return { title: "Update not found — Ali's Heat Crunch Delight" };

  return {
    title: `${update.title} — Ali's Heat Crunch Delight`,
    description: excerpt(update.description, 155),
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

        {update.published_at && (
          <p className="mt-8 text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
            <time dateTime={update.published_at}>
              {formatPublished(update.published_at)}
            </time>
          </p>
        )}

        <h1 className="display-hed mt-3 text-[clamp(2.25rem,8vw,4rem)] text-cream">
          {update.title}
        </h1>

        <div className="flame-rule mt-8 h-1 w-full" aria-hidden="true" />

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
