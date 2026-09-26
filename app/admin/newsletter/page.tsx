import Link from "next/link";
import { newsletterReadiness } from "@/lib/newsletter/config";
import { getContactTotals } from "@/lib/newsletter/resend";
import { createClient } from "@/lib/supabase/server";
import { listAllUpdates } from "@/lib/updates/queries";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-navy tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[0.7rem] text-slate-400">{hint}</p>}
    </div>
  );
}

export default async function AdminNewsletterPage() {
  const readiness = newsletterReadiness();

  // Pending confirmations come from Supabase; the admin SELECT policy allows
  // this count. Individual addresses are never rendered.
  const supabase = await createClient();
  const { count: pendingCount, error: pendingError } = await supabase
    .from("newsletter_pending")
    .select("id", { count: "exact", head: true });

  const totals = readiness.ready ? await getContactTotals() : null;

  // Why a figure is missing: either the newsletter isn't configured, or the
  // provider call failed. Either way the dashboard says so rather than
  // showing a zero that looks like a real measurement.
  const unavailableReason = !readiness.ready
    ? readiness.reason
    : totals && !totals.ok
      ? totals.error
      : "Unavailable.";
  const published = (await listAllUpdates()).filter(
    (update) => update.status === "published",
  );

  return (
    <div>
      <h1 className="text-lg font-bold text-navy">Newsletter</h1>
      <p className="mt-1 text-sm text-slate-500">
        Subscriber counts only — individual email addresses are never shown
        here.
      </p>

      {!readiness.ready && (
        <div className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            Newsletter not active
          </p>
          <p className="mt-1 text-sm text-amber-800">{readiness.reason}</p>
          <p className="mt-2 text-xs text-amber-800">
            Subscriber figures are unavailable until the email provider is
            configured. Nothing below is estimated.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {totals?.ok ? (
          <>
            <Stat
              label="Confirmed subscribers"
              value={String(totals.data.confirmed)}
            />
            <Stat
              label="Unsubscribed"
              value={String(totals.data.unsubscribed)}
            />
            <Stat
              label="Signed up (30 days)"
              value={String(totals.data.recent)}
            />
          </>
        ) : (
          <>
            <UnavailableStat
              label="Confirmed subscribers"
              reason={unavailableReason}
            />
            <UnavailableStat
              label="Unsubscribed"
              reason={unavailableReason}
            />
            <UnavailableStat
              label="Signed up (30 days)"
              reason={unavailableReason}
            />
          </>
        )}

        {/* A failed query must not render as 0 — that would look like a real
            measurement. Most likely cause is the migration not being run. */}
        {pendingError ? (
          <UnavailableStat
            label="Pending confirmations"
            reason="Couldn't read pending signups. Has the newsletter migration been run?"
          />
        ) : (
          <Stat
            label="Pending confirmations"
            value={String(pendingCount ?? 0)}
            hint="Signed up but not yet confirmed"
          />
        )}
      </div>

      {totals?.ok && totals.data.truncated && (
        <p className="mt-3 text-xs text-slate-500">
          Counts stop after 2,000 contacts. Raise the page limit in
          lib/newsletter/resend.ts if the list grows beyond that.
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
          Prepare an announcement
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Preview a published update as a newsletter. Sending is not enabled —
          this renders the email so you can check it before broadcasts are ever
          switched on.
        </p>

        {published.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No published updates yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 border border-slate-200 bg-white">
            {published.slice(0, 8).map((update) => (
              <li
                key={update.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2"
              >
                <span className="text-sm font-medium text-navy">
                  {update.title}
                </span>
                <Link
                  href={`/admin/newsletter/compose?update=${update.id}`}
                  className="text-sm font-medium text-blue hover:underline"
                >
                  Preview as email
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        Before any broadcast can be sent, the family needs to approve the sender
        identity, supply a business mailing address for the email footer (legally
        required in marketing email), and test the unsubscribe link end to end.
        No sending code exists until then.
      </p>
    </div>
  );
}

function UnavailableStat({
  label,
  reason,
}: {
  label: string;
  reason: string;
}) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-400">Unavailable</p>
      <p className="mt-0.5 text-[0.7rem] text-slate-400">{reason}</p>
    </div>
  );
}
