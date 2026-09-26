import Link from "next/link";
import TestSendButton from "@/components/admin/TestSendButton";
import { sendingConfig } from "@/lib/newsletter/config";
import { renderUpdateEmail } from "@/lib/newsletter/update-email";
import { getPublishedUpdateBySlug, listAllUpdates } from "@/lib/updates/queries";

/**
 * Newsletter preview, plus an admin-only test send.
 *
 * Only PUBLISHED updates can be chosen, so a draft can never be previewed for
 * distribution or mailed. Broadcasting to subscribers is not implemented —
 * there is no code path from here to Resend's Broadcast API.
 */
export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ update?: string }>;
}) {
  const { update: updateId } = await searchParams;

  const all = await listAllUpdates();
  const published = all.filter((row) => row.status === "published");
  const chosen = published.find((row) => row.id === updateId);
  const full = chosen ? await getPublishedUpdateBySlug(chosen.slug) : null;

  const sending = sendingConfig();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
    : "https://alisheatcrunchdelight.com";

  const rendered = full ? renderUpdateEmail(full, siteUrl, { isTest: true }) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-navy">Newsletter preview</h1>
        <Link
          href="/admin/newsletter"
          className="text-sm font-medium text-blue hover:underline"
        >
          Back to newsletter
        </Link>
      </div>

      <div className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          Preview and self-test only
        </p>
        <p className="mt-1 text-sm text-amber-800">
          You can send this to yourself to check how it renders. Sending to
          subscribers is not implemented — broadcasts need the family to approve
          the sender identity and supply a business mailing address for the
          footer first.
        </p>
      </div>

      {published.length > 0 && (
        <nav aria-label="Choose an update" className="mt-6">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Published updates
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {published.slice(0, 10).map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/newsletter/compose?update=${row.id}`}
                  aria-current={row.id === updateId ? "page" : undefined}
                  className={`inline-flex items-center border px-3 py-1.5 text-sm font-medium transition-colors ${
                    row.id === updateId
                      ? "border-navy bg-navy text-white"
                      : "border-slate-300 bg-white text-navy hover:border-navy"
                  }`}
                >
                  {row.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {!rendered || !chosen ? (
        <p className="mt-6 text-sm text-slate-600">
          {published.length === 0
            ? "No published updates yet."
            : "Choose a published update above to preview it."}
        </p>
      ) : (
        <>
          <dl className="mt-6 grid gap-2 border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-600">Subject</dt>
              <dd className="text-navy">{rendered.subject}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">From</dt>
              <dd className="break-all text-navy">
                {sending?.from ?? "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">Reply-To</dt>
              <dd className="break-all text-navy">
                {sending?.replyTo ?? "Not configured"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <TestSendButton
              updateId={chosen.id}
              disabled={!sending}
              disabledReason={
                sending
                  ? undefined
                  : "Email sending isn't configured, so a test can't be sent."
              }
            />
          </div>

          <h2 className="mt-8 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Rendered email
          </h2>
          <div className="mt-2 border border-slate-200 bg-white p-2">
            <iframe
              title="Newsletter preview"
              srcDoc={rendered.html}
              sandbox=""
              className="h-[40rem] w-full border-0"
            />
          </div>

          <h2 className="mt-6 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Plain-text alternative
          </h2>
          <pre className="mt-2 overflow-x-auto border border-slate-200 bg-white p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
            {rendered.text}
          </pre>
        </>
      )}
    </div>
  );
}
