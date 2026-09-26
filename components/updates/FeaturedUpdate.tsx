import Image from "next/image";
import Link from "next/link";
import CategoryBadge from "@/components/updates/CategoryBadge";
import { excerpt, formatPublished } from "@/components/updates/UpdateCard";
import { formatEventRange } from "@/lib/updates/time";
import type { UpdateWithImages } from "@/lib/updates/types";

/**
 * The single featured update, shown above the archive on /updates.
 *
 * Only ever rendered for something worth promoting — getFeaturedUpdate()
 * already filters out drafts and expired events.
 */
export default function FeaturedUpdate({
  update,
}: {
  update: UpdateWithImages;
}) {
  const cover = update.images[0];
  const when =
    update.category === "market-event"
      ? formatEventRange(update.event_start_at, update.event_end_at)
      : "";

  return (
    <article className="mt-10 border border-orange/40 bg-navy-soft">
      <div className="grid gap-0 md:grid-cols-2">
        {cover && (
          <Link
            href={`/updates/${update.slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className="relative block aspect-[16/10] w-full overflow-hidden md:aspect-auto md:min-h-full"
          >
            <Image
              src={cover.url}
              alt=""
              fill
              sizes="(min-width: 768px) 32rem, 92vw"
              className="object-cover"
              unoptimized
            />
          </Link>
        )}

        <div className="p-6 sm:p-8">
          <p className="text-[0.65rem] font-bold tracking-[0.22em] text-flame uppercase sm:text-xs">
            Featured
          </p>

          <div className="mt-3">
            <CategoryBadge category={update.category} />
          </div>

          <h2 className="display-hed mt-4 text-[clamp(1.75rem,5vw,2.75rem)] text-cream">
            <Link
              href={`/updates/${update.slug}`}
              className="transition-colors hover:text-flame"
            >
              {update.title}
            </Link>
          </h2>

          {when && (
            <p className="mt-3 text-sm font-semibold text-blue sm:text-base">
              {when}
            </p>
          )}

          {update.venue_name && (
            <p className="mt-1 text-sm text-cream/70">{update.venue_name}</p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-cream/75 sm:text-base">
            {excerpt(update.description, 220)}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={`/updates/${update.slug}`}
              className="inline-flex items-center gap-2 rounded-sm bg-orange px-6 py-3 text-sm font-bold tracking-wide text-navy uppercase transition-colors hover:bg-flame"
            >
              Read update
              <span aria-hidden="true">&rarr;</span>
            </Link>
            {update.published_at && (
              <span className="text-xs text-cream/50 sm:text-sm">
                {formatPublished(update.published_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
