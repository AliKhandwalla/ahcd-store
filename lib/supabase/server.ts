import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for server components, server actions and route handlers.
 *
 * Next.js 15 makes `cookies()` async, hence the await. Uses the current
 * getAll/setAll cookie interface rather than the deprecated get/set/remove.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. That is fine: middleware
            // refreshes the session on every request, so the write is redundant
            // here rather than lost.
          }
        },
      },
    },
  );
}
