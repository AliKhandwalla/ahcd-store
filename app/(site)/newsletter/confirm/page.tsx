import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { CONSENT_VERSION, newsletterReadiness } from "@/lib/newsletter/config";
import { upsertConfirmedContact } from "@/lib/newsletter/resend";
import { hashToken } from "@/lib/newsletter/tokens";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Confirm your subscription — Ali's Heat Crunch Delight",
  robots: { index: false, follow: false },
};

type Outcome = "confirmed" | "expired" | "missing" | "failed" | "disabled";

const MESSAGES: Record<Outcome, { heading: string; body: string }> = {
  confirmed: {
    heading: "You're in.",
    body: "You'll get occasional updates on where to find us, new flavours, and what's next for AHCD. Every email has an unsubscribe link.",
  },
  expired: {
    heading: "That link has expired.",
    body: "Confirmation links last 24 hours and can only be used once. Request a new one and we'll send a fresh link.",
  },
  missing: {
    heading: "Something's missing.",
    body: "That link doesn't look complete. Try opening it again from the email, or request a new one.",
  },
  failed: {
    heading: "We couldn't finish that.",
    body: "Your confirmation didn't go through. Please request a new link and try again.",
  },
  disabled: {
    heading: "Signups aren't open yet.",
    body: "The newsletter isn't accepting subscriptions at the moment.",
  },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const outcome = await confirm(token);
  const { heading, body } = MESSAGES[outcome];

  return (
    <AuthShell eyebrow="Newsletter" heading={heading}>
      <p
        role={outcome === "confirmed" ? "status" : "alert"}
        className="mt-6 max-w-lg border-l-4 border-orange bg-navy-soft px-5 py-4 text-base leading-relaxed text-cream/85"
      >
        {body}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/updates"
          className="inline-flex items-center justify-center rounded-sm bg-orange px-8 py-4 text-base font-bold tracking-wide text-navy uppercase transition-colors hover:bg-flame"
        >
          Read the latest
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-sm border border-cream/25 px-8 py-4 text-base font-bold tracking-wide text-cream uppercase transition-colors hover:border-flame hover:text-flame"
        >
          Back to the shop
        </Link>
      </div>
    </AuthShell>
  );
}

async function confirm(token: string | undefined): Promise<Outcome> {
  const readiness = newsletterReadiness();
  if (!readiness.ready) return "disabled";
  if (!token) return "missing";

  const supabase = await createClient();

  // Exchanges the token hash for the address and deletes the row, so the
  // token is single-use. Unknown, expired and already-used tokens are
  // indistinguishable here by design.
  const { data, error } = await supabase.rpc("newsletter_confirm", {
    p_token_hash: hashToken(token),
  });

  if (error) return "failed";

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.email) return "expired";

  // Only now does the address reach Resend, with unsubscribed:false — which
  // is also why a previously unsubscribed contact is never reactivated
  // without a fresh opt-in.
  const result = await upsertConfirmedContact({
    email: row.email as string,
    consentVersion: (row.consent_version as string) ?? CONSENT_VERSION,
    consentedAt:
      (row.consented_at as string) ?? new Date().toISOString(),
  });

  return result.ok ? "confirmed" : "failed";
}
