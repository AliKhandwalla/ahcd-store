import Link from "next/link";
import DeleteUpdateButton from "@/components/admin/DeleteUpdateButton";
import StatusPill from "@/components/admin/StatusPill";
import { listAllUpdates } from "@/lib/updates/queries";
import {
  CATEGORY_LABELS,
  UPDATE_CATEGORIES,
  isUpdateCategory,
} from "@/lib/updates/types";
import { adminPageAllowed } from "@/lib/admin/auth";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Published" },
] as const;

/** Builds a filter href that preserves whichever filter isn't being changed. */
function filterHref(status: string, category: string | null) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/admin/updates?${query}` : "/admin/updates";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  // The layout cannot protect this page: layouts and pages render in
  // parallel, so its redirect does not stop this component running.
  if (!(await adminPageAllowed())) return null;

  const { status, category } = await searchParams;
  const active = FILTERS.some((f) => f.key === status) ? status! : "all";
  const activeCategory = isUpdateCategory(category) ? category : null;

  const all = await listAllUpdates();
  const rows = all
    .filter((u) => active === "all" || u.status === active)
    .filter((u) => !activeCategory || u.category === activeCategory);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-navy">Updates</h1>
        <Link
          href="/admin/updates/new"
          className="inline-flex items-center border border-navy bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-soft"
        >
          New update
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1" role="group" aria-label="Filter by status">
          {FILTERS.map((filter) => {
            const isActive = filter.key === active;
            return (
              <Link
                key={filter.key}
                href={filterHref(filter.key, activeCategory)}
                aria-current={isActive ? "page" : undefined}
                className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-navy bg-navy text-white"
                    : "border-slate-300 bg-white text-navy hover:border-navy"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Filter by category"
        >
          <Link
            href={filterHref(active, null)}
            aria-current={!activeCategory ? "page" : undefined}
            className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
              !activeCategory
                ? "border-blue bg-blue text-white"
                : "border-slate-300 bg-white text-navy hover:border-blue"
            }`}
          >
            Any category
          </Link>
          {UPDATE_CATEGORIES.map((key) => {
            const isActive = key === activeCategory;
            return (
              <Link
                key={key}
                href={filterHref(active, key)}
                aria-current={isActive ? "page" : undefined}
                className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue bg-blue text-white"
                    : "border-slate-300 bg-white text-navy hover:border-blue"
                }`}
              >
                {CATEGORY_LABELS[key]}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-slate-600">Title</th>
              <th className="px-4 py-2 font-medium text-slate-600">Category</th>
              <th className="px-4 py-2 font-medium text-slate-600">Status</th>
              <th className="px-4 py-2 font-medium text-slate-600">Images</th>
              <th className="px-4 py-2 font-medium text-slate-600">Published</th>
              <th className="px-4 py-2 font-medium text-slate-600">Updated</th>
              <th className="px-4 py-2 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {all.length === 0 ? (
                    <>
                      No updates yet.{" "}
                      <Link
                        href="/admin/updates/new"
                        className="text-blue hover:underline"
                      >
                        Write the first one
                      </Link>
                      .
                    </>
                  ) : (
                    `No ${active} updates.`
                  )}
                </td>
              </tr>
            ) : (
              rows.map((update) => (
                <tr
                  key={update.id}
                  className="border-b border-slate-100 align-middle last:border-0"
                >
                  <td className="max-w-xs px-4 py-2">
                    <span className="block truncate font-medium text-navy">
                      {update.title}
                      {update.is_featured && (
                        <span
                          title="Featured"
                          className="ml-2 align-middle text-xs font-bold text-orange-deep"
                        >
                          ★
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {CATEGORY_LABELS[update.category]}
                  </td>
                  <td className="px-4 py-2">
                    <StatusPill status={update.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-600 tabular-nums">
                    {update.imageCount}
                  </td>
                  <td className="px-4 py-2 text-slate-600 tabular-nums">
                    {formatDate(update.published_at)}
                  </td>
                  <td className="px-4 py-2 text-slate-600 tabular-nums">
                    {formatDate(update.updated_at)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/updates/${update.id}/edit`}
                        className="text-sm font-medium text-blue hover:underline"
                      >
                        Edit
                      </Link>
                      {update.status === "published" ? (
                        <Link
                          href={`/updates/${update.slug}`}
                          className="text-sm font-medium text-blue hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        <span
                          className="text-sm text-slate-400"
                          title="Drafts have no public page"
                        >
                          View
                        </span>
                      )}
                      <DeleteUpdateButton id={update.id} title={update.title} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
