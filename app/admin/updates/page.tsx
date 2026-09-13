import Link from "next/link";
import DeleteUpdateButton from "@/components/admin/DeleteUpdateButton";
import StatusPill from "@/components/admin/StatusPill";
import { listAllUpdates } from "@/lib/updates/queries";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Published" },
] as const;

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
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = FILTERS.some((f) => f.key === status) ? status! : "all";

  const all = await listAllUpdates();
  const rows = active === "all" ? all : all.filter((u) => u.status === active);

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

      <div className="mt-4 flex items-center gap-1" role="group" aria-label="Filter">
        {FILTERS.map((filter) => {
          const isActive = filter.key === active;
          return (
            <Link
              key={filter.key}
              href={
                filter.key === "all"
                  ? "/admin/updates"
                  : `/admin/updates?status=${filter.key}`
              }
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

      <div className="mt-4 overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-slate-600">Title</th>
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
                    </span>
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
