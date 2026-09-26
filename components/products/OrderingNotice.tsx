import Link from "next/link";
import { site } from "@/lib/site";

/**
 * The single place the "online ordering isn't open yet" message is written, so
 * it can never drift between the homepage, the catalogue and the detail pages.
 *
 * Intentionally contains no button, form or control that could be mistaken for
 * a way to buy something — only an outbound link to Instagram and a link to
 * Updates, where markets and new batches are announced.
 */
export default function OrderingNotice({
  tone = "light",
}: {
  /** "light" sits on cream/white surfaces, "dark" on navy. */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div
      className={`border-l-4 border-orange p-5 sm:p-6 ${
        dark ? "bg-navy-soft" : "bg-white shadow-sm"
      }`}
    >
      <p
        className={`display-hed text-2xl sm:text-3xl ${dark ? "text-cream" : "text-navy"}`}
      >
        Online ordering coming soon
      </p>
      <p
        className={`mt-3 text-sm leading-relaxed sm:text-base ${
          dark ? "text-cream/75" : "text-ink/75"
        }`}
      >
        AHCD sells in person, so the prices shown are what you&rsquo;ll pay at
        the table. Follow along on Instagram or check{" "}
        <Link
          href="/updates"
          className={`underline underline-offset-4 ${
            dark ? "text-flame hover:text-orange" : "text-orange-deep hover:text-orange"
          }`}
        >
          Updates
        </Link>{" "}
        to see where we&rsquo;ll be next.
      </p>

      <a
        href={site.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-5 inline-flex items-center gap-2 rounded-sm px-6 py-3.5 text-sm font-bold tracking-wide uppercase transition-colors ${
          dark
            ? "bg-cream text-navy hover:bg-flame"
            : "bg-navy text-cream hover:bg-orange hover:text-navy"
        }`}
      >
        Follow on Instagram
        <span aria-hidden="true">&rarr;</span>
      </a>

      <p
        className={`mt-3 text-xs tracking-wide sm:text-sm ${
          dark ? "text-cream/50" : "text-ink/55"
        }`}
      >
        {site.instagramHandle}
      </p>
    </div>
  );
}
