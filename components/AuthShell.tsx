import Image from "next/image";
import { site } from "@/lib/site";

/**
 * Shared navy canvas for the auth routes, so /login, /account and the auth
 * error page sit on the same AHCD surface as the landing page sections.
 */
export default function AuthShell({
  eyebrow,
  heading,
  children,
  showCrest = false,
}: {
  eyebrow?: string;
  heading: string;
  children: React.ReactNode;
  showCrest?: boolean;
}) {
  return (
    <section className="bg-navy">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        {showCrest && (
          <Image
            src="/images/ahcd-logo.png"
            alt={`${site.name} logo`}
            width={1280}
            height={680}
            priority
            className="mb-8 h-16 w-auto sm:h-20"
          />
        )}

        {eyebrow && (
          <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
            {eyebrow}
          </p>
        )}

        <h1 className="display-hed mt-3 text-[clamp(2.5rem,9vw,4.5rem)] text-cream">
          {heading}
        </h1>

        {children}
      </div>
    </section>
  );
}
