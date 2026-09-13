import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Only same-origin relative paths may be used as a post-login destination,
 * otherwise `?next=https://evil.example` would turn this route into an open
 * redirect. "//host" is rejected too, since browsers read it as protocol-relative.
 */
function safeNext(value: string | null) {
  if (!value) return "/account";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const next = safeNext(searchParams.get("next"));

  const errorPage = (reason: string) =>
    NextResponse.redirect(`${origin}/auth/auth-code-error?reason=${reason}`);

  // The user dismissed or denied the Google consent screen.
  if (oauthError) {
    return errorPage(oauthError === "access_denied" ? "cancelled" : "provider");
  }

  if (!code) {
    return errorPage("missing");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return errorPage("exchange");
  }

  // Behind Vercel's proxy the request origin is an internal host, so prefer the
  // forwarded host. This keeps the redirect correct on localhost, on
  // ahcd-store.vercel.app and on the custom domain without hard-coding any host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
