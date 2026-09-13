import Image from "next/image";
import Link from "next/link";
import type { UpdateWithImages } from "@/lib/updates/types";

export function formatPublished(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function excerpt(text: string, limit = 180) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  return `${flat.slice(0, flat.lastIndexOf(" ", limit)).trim()}…`;
}

export default function UpdateCard({ update }: { update: UpdateWithImages }) {
  const cover = update.images[0];

  return (
    <article className="border border-navy-line bg-navy-soft">
      {cover && (
        <Link
          href={`/updates/${update.slug}`}
          className="relative block aspect-[16/9] w-full overflow-hidden"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={cover.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 32rem, 92vw"
            className="object-cover"
            unoptimized
          />
        </Link>
      )}

      <div className="p-5 sm:p-6">
        {update.published_at && (
          <p className="text-xs font-bold tracking-[0.18em] text-orange uppercase">
            {formatPublished(update.published_at)}
          </p>
        )}

        <h2 className="display-hed mt-2 text-2xl text-cream sm:text-3xl">
          <Link
            href={`/updates/${update.slug}`}
            className="transition-colors hover:text-flame"
          >
            {update.title}
          </Link>
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-cream/75 sm:text-base">
          {excerpt(update.description)}
        </p>

        <Link
          href={`/updates/${update.slug}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] text-flame uppercase transition-colors hover:text-orange"
        >
          Read update
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </article>
  );
}
