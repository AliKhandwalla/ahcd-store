"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Administrative cleanup of expired pending confirmations.
 *
 * Both operations go through SECURITY DEFINER functions that re-check
 * is_ahcd_admin() in the database. The requireAdmin() call here is the
 * application's own gate — a server action is a publicly reachable endpoint,
 * so it cannot rely on the layout — and the database check is the one that
 * actually holds if this gate is ever bypassed.
 *
 * newsletter_pending has no DELETE policy. The prune function's predicate is
 * fixed at `expires_at < now()` and takes no arguments, so neither this code
 * nor a hostile caller can widen it to reach someone still waiting to confirm.
 */

export type PruneState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

export async function countExpiredPending(): Promise<number | null> {
  const gate = await requireAdmin();
  if (!gate.ok) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("newsletter_expired_count");
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const value = typeof row === "number" ? row : row?.expired;
  return typeof value === "number" ? value : null;
}

export async function pruneExpiredPending(): Promise<PruneState> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { status: "error", message: "Not authorised." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("newsletter_prune_expired");

  if (error) {
    return {
      status: "error",
      message:
        "Cleanup didn't run. Has the newsletter_admin_prune migration been applied?",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const deleted = typeof row === "number" ? row : (row?.deleted ?? 0);

  revalidatePath("/admin/newsletter");

  return {
    status: "done",
    message:
      deleted === 0
        ? "Nothing to remove — no confirmations have expired."
        : `Removed ${deleted} expired ${deleted === 1 ? "confirmation" : "confirmations"}.`,
  };
}
