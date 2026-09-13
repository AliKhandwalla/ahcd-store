// Importing this module from a client component is a build error. ADMIN_EMAIL
// must never reach the browser bundle, and this is the security boundary for
// the whole admin area, so the guarantee is enforced by the compiler rather
// than by discipline.
import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminGate =
  | { ok: true; user: User }
  | { ok: false; reason: "anon" | "forbidden" };

function normalise(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

/** True only for the configured single admin. */
export function isAdminEmail(email: string | null | undefined) {
  const admin = normalise(process.env.ADMIN_EMAIL);
  const candidate = normalise(email);
  // An unset ADMIN_EMAIL must never make everyone an admin.
  if (!admin || !candidate) return false;
  return admin === candidate;
}

/**
 * Resolves the caller's admin status from the verified Supabase user.
 *
 * Uses getUser(), which revalidates the token against Supabase, never
 * getSession() (cookie-only, spoofable) and never an email supplied by the
 * browser. Callers decide what to do with each outcome, because /admin pages
 * redirect anonymous visitors but render a 403 for signed-in non-admins.
 *
 * Every admin server action must call this independently: server actions are
 * publicly reachable endpoints, so a layout check does not protect them.
 */
export async function requireAdmin(): Promise<AdminGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "anon" };

  // Google-issued identities are confirmed; refuse anything unverified so a
  // hypothetical unverified account can never match on email alone.
  if (!user.email_confirmed_at) return { ok: false, reason: "forbidden" };

  if (!isAdminEmail(user.email)) return { ok: false, reason: "forbidden" };

  return { ok: true, user };
}

/** Throws unless the caller is the admin. For use at the top of server actions. */
export async function assertAdmin(): Promise<User> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    throw new Error("Not authorised");
  }
  return gate.user;
}
