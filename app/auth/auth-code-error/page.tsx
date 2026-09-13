import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Sign-in problem — Ali's Heat Crunch Delight",
};

/**
 * Friendly, non-technical copy only. No stack traces, no error objects, no
 * environment values — the `reason` code maps to a fixed sentence and anything
 * unrecognised falls back to the generic message.
 */
const MESSAGES: Record<string, string> = {
  cancelled:
    "Sign-in was cancelled before it finished. No account was created and nothing was shared.",
  provider:
    "Google couldn't complete sign-in just now. This is usually temporary.",
  missing:
    "That sign-in link was incomplete, which usually means it was opened out of order or had already been used.",
  exchange:
    "We couldn't finish setting up your session. The sign-in link may have already been used or expired.",
};

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message =
    (reason && MESSAGES[reason]) ??
    "Something went wrong while signing you in.";

  return (
    <AuthShell eyebrow="Sign-in" heading="That didn't work.">
      <p
        role="alert"
        className="mt-6 max-w-lg border-l-4 border-orange bg-navy-soft px-5 py-4 text-base leading-relaxed text-cream/85"
      >
        {message}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-sm bg-orange px-8 py-4 text-base font-bold tracking-wide text-navy uppercase transition-colors hover:bg-flame"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-cream/25 px-8 py-4 text-base font-bold tracking-wide text-cream uppercase transition-colors hover:border-flame hover:text-flame"
        >
          Back to the shop
        </Link>
      </div>
    </AuthShell>
  );
}
