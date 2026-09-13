import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for client components.
 *
 * Only the publishable key is used here. It is designed to be public — it ships
 * in the browser bundle by definition. No secret or service-role key is ever
 * referenced in client code.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
