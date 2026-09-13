import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UpdateRow } from "@/lib/updates/types";

export type Metric = {
  label: string;
  /** Formatted value. Ignored when `tracked` is false. */
  value: string;
  /** false renders "Not tracked yet" instead of a number. */
  tracked: boolean;
  /** Which future milestone will supply this. Shown as a small hint. */
  pending?: string;
};

export type MetricGroup = {
  title: string;
  metrics: Metric[];
};

export type AdminMetrics = {
  groups: MetricGroup[];
  recentUpdates: Pick<UpdateRow, "id" | "title" | "status" | "published_at">[];
};

/**
 * Single source of truth for every dashboard number.
 *
 * Metrics that have no data source yet are marked `tracked: false` and carry a
 * note naming the milestone that will provide them. Nothing here fabricates a
 * value, and no placeholder literals are duplicated in components.
 */
const NOT_YET = {
  checkout: "Arrives with checkout and orders",
  traffic: "Arrives with traffic tracking",
  fulfilment: "Arrives with order fulfilment",
} as const;

function untracked(label: string, pending: string): Metric {
  return { label, value: "—", tracked: false, pending };
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = await createClient();

  // The only genuinely real numbers in this milestone. RLS grants the admin
  // visibility of drafts as well as published updates.
  const { data } = await supabase
    .from("updates")
    .select("id, title, status, published_at, updated_at")
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as (UpdateRow & { updated_at: string })[];
  const published = rows.filter((row) => row.status === "published");
  const drafts = rows.filter((row) => row.status === "draft");

  const mostRecent = published
    .slice()
    .sort((a, b) =>
      (b.published_at ?? "").localeCompare(a.published_at ?? ""),
    )[0];

  return {
    groups: [
      {
        title: "Commerce",
        metrics: [
          untracked("Total revenue", NOT_YET.checkout),
          untracked("Total orders", NOT_YET.checkout),
          untracked("Units sold", NOT_YET.checkout),
          untracked("Average order value", NOT_YET.checkout),
        ],
      },
      {
        title: "Customers",
        metrics: [
          untracked("Unique customers", NOT_YET.checkout),
          untracked("Repeat customers", NOT_YET.checkout),
          untracked("Repeat customer rate", NOT_YET.checkout),
        ],
      },
      {
        title: "Conversion",
        metrics: [
          untracked("Site visitors", NOT_YET.traffic),
          untracked("Product views", NOT_YET.traffic),
          untracked("Checkout starts", NOT_YET.checkout),
          untracked("Completed orders", NOT_YET.checkout),
          untracked("Conversion rate", NOT_YET.traffic),
        ],
      },
      {
        title: "Products",
        metrics: [
          untracked("Best-selling product", NOT_YET.checkout),
          untracked("Units sold by product", NOT_YET.checkout),
        ],
      },
      {
        title: "Operations",
        metrics: [
          untracked("Awaiting fulfilment", NOT_YET.fulfilment),
          untracked("Preparing", NOT_YET.fulfilment),
          untracked("Ready", NOT_YET.fulfilment),
          untracked("Completed", NOT_YET.fulfilment),
        ],
      },
      {
        title: "Content",
        metrics: [
          {
            label: "Published updates",
            value: String(published.length),
            tracked: true,
          },
          { label: "Draft updates", value: String(drafts.length), tracked: true },
          { label: "Total updates", value: String(rows.length), tracked: true },
          {
            label: "Most recent update",
            value: mostRecent?.title ?? "None yet",
            tracked: true,
          },
        ],
      },
    ],
    recentUpdates: rows.slice(0, 5).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      published_at: row.published_at,
    })),
  };
}
