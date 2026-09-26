import Link from "next/link";
import {
  CATEGORY_LABELS,
  UPDATE_CATEGORIES,
  type UpdateCategory,
} from "@/lib/updates/types";

/**
 * Category filter chips.
 *
 * Plain links rather than client-side state, so each filter is a shareable,
 * bookmarkable URL and the page needs no JavaScript. "All" is the default and
 * preserves normal newest-first browsing.
 */
export default function CategoryFilter({
  active,
}: {
  active: UpdateCategory | null;
}) {
  const options: { key: UpdateCategory | null; label: string }[] = [
    { key: null, label: "All" },
    ...UPDATE_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key] })),
  ];

  return (
    <nav aria-label="Filter updates by category" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.key === active;
          return (
            <li key={option.key ?? "all"}>
              <Link
                href={option.key ? `/updates?category=${option.key}` : "/updates"}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center border px-3 py-1.5 text-xs font-bold tracking-[0.14em] uppercase transition-colors sm:text-sm ${
                  isActive
                    ? "border-orange bg-orange text-navy"
                    : "border-navy-line text-cream/75 hover:border-orange hover:text-flame"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
