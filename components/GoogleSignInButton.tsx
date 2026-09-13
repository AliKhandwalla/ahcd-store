"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignIn() {
    setPending(true);
    setFailed(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Built from the live origin, so the same code works on localhost,
          // on the Vercel domain and on the custom domain.
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      // On success the browser is navigating away, so `pending` is left set.
      if (error) {
        setFailed(true);
        setPending(false);
      }
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-3 rounded-sm bg-cream px-6 py-4 text-base font-bold tracking-wide text-ink uppercase transition-colors hover:bg-flame disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
      >
        <GoogleMark />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>

      {failed && (
        <p
          role="alert"
          className="mt-4 border-l-4 border-orange bg-navy-soft px-4 py-3 text-sm text-cream/85"
        >
          We couldn&rsquo;t start sign-in with Google. Please try again.
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className="h-5 w-5 shrink-0"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
