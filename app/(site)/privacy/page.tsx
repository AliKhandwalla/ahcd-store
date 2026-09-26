import type { Metadata } from "next";
import Link from "next/link";
import { publishableContactEmail } from "@/lib/newsletter/config";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy — Ali's Heat Crunch Delight",
  description:
    "What information Ali's Heat Crunch Delight collects when you subscribe to updates, why, and how to unsubscribe.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="display-hed text-2xl text-cream sm:text-3xl">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-cream/80">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  // Null until the contact address has been verified as reachable. An address
  // nobody can receive mail at is worse than no address at all.
  const contactEmail = publishableContactEmail();

  return (
    <article className="bg-navy">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
          Privacy
        </p>
        <h1 className="display-hed mt-3 text-[clamp(2.25rem,8vw,4rem)] text-cream">
          Your information
        </h1>
        <p className="mt-5 text-base leading-relaxed text-cream/75 sm:text-lg">
          {site.name} is a small business. This page explains, plainly, what we
          collect when you subscribe to updates and what happens to it.
        </p>

        <div className="flame-rule mt-8 h-1 w-full" aria-hidden="true" />

        <Section title="What we collect">
          <p>
            Your email address, and nothing else. We don&rsquo;t ask for your
            name, address, phone number or any other detail, and we don&rsquo;t
            use advertising trackers or build profiles of subscribers.
          </p>
          <p>
            We also record which version of this notice you agreed to and when,
            so we have a record of what you consented to.
          </p>
        </Section>

        <Section title="Why we collect it">
          <p>
            Only to send you the updates you asked for: where to find us at
            markets, new flavours, and AHCD news. We don&rsquo;t sell, rent or
            share your address with anyone for their own purposes.
          </p>
        </Section>

        <Section title="Who processes it">
          <p>
            We use{" "}
            <a
              href="https://resend.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-flame underline underline-offset-4 hover:text-orange"
            >
              Resend
            </a>
            , an email delivery service, to store the subscriber list and send
            the emails. Your address is held on their systems for that purpose.
          </p>
          <p>
            Before you confirm, your address is held briefly by our website
            host so we can send you the confirmation link. If you never
            confirm, that record is deleted automatically.
          </p>
        </Section>

        <Section title="Confirming and unsubscribing">
          <p>
            We use double opt-in: after you sign up we email you a link, and
            you only join the list once you click it. That link expires after
            24 hours and works once.
          </p>
          <p>
            Every email we send includes an unsubscribe link. Using it stops
            all further emails. If you unsubscribe and later change your mind,
            you&rsquo;ll need to sign up and confirm again &mdash; we
            won&rsquo;t put you back on the list on your behalf.
          </p>
        </Section>

        <Section title="Getting in touch">
          {contactEmail ? (
            <p>
              For anything to do with your information &mdash; including asking
              us to delete it &mdash; email{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-flame underline underline-offset-4 hover:text-orange"
              >
                {contactEmail}
              </a>
              .
            </p>
          ) : (
            <p>
              Message us on Instagram at{" "}
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame underline underline-offset-4 hover:text-orange"
              >
                {site.instagramHandle}
              </a>{" "}
              and we&rsquo;ll help. A dedicated email address for privacy
              questions is on the way.
            </p>
          )}
        </Section>

        <p className="mt-12 border-t border-navy-line pt-6 text-sm text-cream/55">
          If we change how any of this works, we&rsquo;ll update this page.{" "}
          <Link
            href="/"
            className="underline underline-offset-4 hover:text-flame"
          >
            Back to the shop
          </Link>
        </p>
      </div>
    </article>
  );
}
