import Link from "next/link";
import StatusPill from "@/components/admin/StatusPill";
import { getAdminMetrics, type Metric } from "@/lib/admin/metrics";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MetricCell({ metric }: { metric: Metric }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{metric.label}</p>
      {metric.tracked ? (
        <p className="mt-1 truncate text-xl font-semibold text-navy tabular-nums">
          {metric.value}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium text-slate-400">
            Not tracked yet
          </p>
          {metric.pending && (
            <p className="mt-0.5 text-[0.7rem] text-slate-400">
              {metric.pending}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { groups, recentUpdates } = await getAdminMetrics();

  return (
    <div>
      <h1 className="text-lg font-bold text-navy">Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        Content figures are live. Commerce and traffic figures activate as those
        systems are built.
      </p>

      <div className="mt-6 space-y-6">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
              {group.title}
            </h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {group.metrics.map((metric) => (
                <MetricCell key={metric.label} metric={metric} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Recent updates
          </h2>
          <Link
            href="/admin/updates"
            className="text-sm font-medium text-blue hover:underline"
          >
            All updates
          </Link>
        </div>

        <div className="mt-2 overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-slate-600">Title</th>
                <th className="px-4 py-2 font-medium text-slate-600">Status</th>
                <th className="px-4 py-2 font-medium text-slate-600">
                  Published
                </th>
              </tr>
            </thead>
            <tbody>
              {recentUpdates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No updates yet.{" "}
                    <Link
                      href="/admin/updates/new"
                      className="text-blue hover:underline"
                    >
                      Write the first one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                recentUpdates.map((update) => (
                  <tr key={update.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/updates/${update.id}/edit`}
                        className="font-medium text-navy hover:underline"
                      >
                        {update.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <StatusPill status={update.status} />
                    </td>
                    <td className="px-4 py-2 text-slate-600 tabular-nums">
                      {formatDate(update.published_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
