import "server-only";

import { getProductStats } from "@/lib/products/admin-queries";
import { createClient } from "@/lib/supabase/server";
import type { UpdateRow } from "@/lib/updates/types";

export type Metric = {
  label: string;
  /** Formatted value. Ignored when `tracked` is false. */
  value: string;
  /** false renders "Not tracked yet" instead of a number. */
  tracked: boolean;
  /** Which future system will supply this. Shown as a small hint. */
  pending?: string;
};

export type MetricGroup = {
  title: string;
  metrics: Metric[];
};

export type RecentProduct = {
  id: string;
  name: string;
  visibility: string;
  updated_at: string;
};

export type AdminMetrics = {
  groups: MetricGroup[];
  recentUpdates: Pick<UpdateRow, "id" | "title" | "status" | "published_at">[];
  recentProducts: RecentProduct[];
};

/**
 * Single source of truth for every dashboard number.
 *
 * Metrics with no data source yet are marked `tracked: false` and carry a note
 * naming the system that will provide them. Nothing here fabricates a value,
 * and an untracked metric never renders as a misleading zero.
 */
const NOT_YET = {
  checkout: "Arrives with checkout and orders",
  traffic: "Arrives with traffic tracking",
  fulfilment: "Arrives with order fulfilment",
} as const;

function untracked(label: string, pending: string): Metric {
  return { label, value: "—", tracked: false, pending };
}

function real(label: string, value: string | number): Metric {
  return { label, value: String(value), tracked: true };
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = await createClient();

  // RLS grants the admin visibility of drafts as well as published updates.
  const [{ data: updateData }, products] = await Promise.all([
    supabase
      .from("updates")
      .select(
        "id, title, status, category, published_at, updated_at, event_start_at, event_end_at",
      )
      .order("updated_at", { ascending: false }),
    getProductStats(),
  ]);

  const rows = (updateData ?? []) as (UpdateRow & { updated_at: string })[];
  const published = rows.filter((row) => row.status === "published");
  const drafts = rows.filter((row) => row.status === "draft");

  const now = Date.now();
  const upcomingEvents = published.filter((row) => {
    if (row.category !== "market-event") return false;
    const reference = row.event_end_at ?? row.event_start_at;
    return reference ? new Date(reference).getTime() >= now : false;
  });

  const latestAnnouncement = published
    .filter((row) => row.category === "announcement")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0];

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
        title: "Website",
        metrics: [
          untracked("Visitors", NOT_YET.traffic),
          untracked("Product views", NOT_YET.traffic),
          untracked("Checkout starts", NOT_YET.checkout),
          untracked("Completed online orders", NOT_YET.checkout),
          untracked("Conversion rate", NOT_YET.traffic),
        ],
      },
      {
        title: "Products",
        metrics: [
          real("Total products", products.total),
          real("Published products", products.published),
          real(
            "Hidden products",
            products.hidden + products.archived,
          ),
          real("Updated in last 30 days", products.recentlyUpdated),
          untracked("Best-selling product", NOT_YET.checkout),
        ],
      },
      {
        title: "Operations",
        metrics: [
          untracked("Awaiting fulfilment", NOT_YET.fulfilment),
          untracked("Preparing", NOT_YET.fulfilment),
          untracked("Ready", NOT_YET.fulfilment),
          untracked("Completed orders", NOT_YET.fulfilment),
        ],
      },
      {
        title: "Content",
        metrics: [
          real("Total updates", rows.length),
          real("Published updates", published.length),
          real("Draft updates", drafts.length),
          real("Upcoming market events", upcomingEvents.length),
          real("Most recent announcement", latestAnnouncement?.title ?? "None yet"),
        ],
      },
    ],
    recentUpdates: rows.slice(0, 5).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      published_at: row.published_at,
    })),
    recentProducts: products.recent,
  };
}
