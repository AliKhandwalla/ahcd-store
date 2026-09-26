import { CATEGORY_LABELS, type UpdateCategory } from "@/lib/updates/types";

const TONE: Record<UpdateCategory, string> = {
  "market-event": "border-blue/50 text-blue",
  "product-launch": "border-orange/60 text-orange",
  announcement: "border-cream/30 text-cream/75",
};

export default function CategoryBadge({
  category,
  past = false,
}: {
  category: UpdateCategory;
  /** Adds a quiet "Past event" marker; the post stays in the archive. */
  past?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center border px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.16em] uppercase sm:text-xs ${TONE[category]}`}
      >
        {CATEGORY_LABELS[category]}
      </span>
      {past && (
        <span className="inline-flex items-center border border-cream/20 px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.16em] text-cream/50 uppercase sm:text-xs">
          Past event
        </span>
      )}
    </span>
  );
}
