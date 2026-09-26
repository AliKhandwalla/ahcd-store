import Link from "next/link";
import NewsletterForm from "@/components/newsletter/NewsletterForm";
import { site } from "@/lib/site";
import { newsletterReadiness } from "@/lib/newsletter/config";

/**
 * Newsletter signup section.
 *
 * Server component: it reads the readiness gate so the "not open yet" state is
 * decided on the server and the form is never even rendered — there is no
 * client path that could submit while signups are off.
 */
export default function NewsletterSignup({
  compact = false,
}: {
  /** Smaller variant used on /updates. */
  compact?: boolean;
}) {
  const readiness = newsletterReadiness();

  return (
    <section
      aria-labelledby="newsletter-heading"
      className={compact ? "border-t border-navy-line" : "bg-navy"}
    >
      <div
        className={
          compact
            ? "py-10"
            : "mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        }
      >
        <div className={compact ? "" : "grid gap-10 lg:grid-cols-2 lg:gap-14"}>
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
              Newsletter
            </p>
            <h2
              id="newsletter-heading"
              className={`display-hed mt-3 text-cream ${
                compact
                  ? "text-[clamp(1.75rem,5vw,2.5rem)]"
                  : "text-[clamp(2.25rem,8vw,4rem)]"
              }`}
            >
              Stay in the loop.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-cream/75 sm:text-lg">
              Get occasional updates on where to find us, new flavours, and
              what&rsquo;s next for AHCD.
            </p>
          </div>

          <div className={compact ? "mt-6" : ""}>
            {readiness.ready ? (
              <NewsletterForm compact={compact} />
            ) : (
              <div className="max-w-xl border-l-4 border-orange bg-navy-soft p-5 sm:p-6">
                <p className="display-hed text-xl text-cream sm:text-2xl">
                  Signups open soon
                </p>
                <p className="mt-3 text-sm leading-relaxed text-cream/75 sm:text-base">
                  The newsletter isn&rsquo;t accepting subscriptions yet.
                  In the meantime, follow along on Instagram for markets and new
                  batches.
                </p>
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-sm bg-cream px-6 py-3 text-sm font-bold tracking-wide text-navy uppercase transition-colors hover:bg-flame"
                >
                  Follow on Instagram
                  <span aria-hidden="true">&rarr;</span>
                </a>
                <p className="mt-4 text-xs text-cream/55">
                  <Link
                    href="/privacy"
                    className="underline underline-offset-4 hover:text-flame"
                  >
                    How we handle your information
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
