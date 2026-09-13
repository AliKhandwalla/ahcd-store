"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs the user out.
 *
 * If Supabase reports a failure we do NOT pretend the session was cleared —
 * the user stays signed in and is sent back to /account with a branded notice,
 * so they can retry rather than walking away believing they are signed out.
 */
export async function signOut() {
  let failed = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) failed = true;
  } catch {
    failed = true;
  }

  // redirect() signals via a thrown control-flow error, so it must sit outside
  // the try/catch above or it would be swallowed as a sign-out failure.
  if (failed) {
    redirect("/account?error=signout");
  }

  revalidatePath("/", "layout");
  redirect("/");
}
