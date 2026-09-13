import Image from "next/image";
import { navLinks, site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-navy-line bg-navy">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Image
              src="/images/ahcd-logo.png"
              alt={`${site.name} logo`}
              width={1280}
              height={680}
              className="h-16 w-auto sm:h-20"
            />
            <p className="mt-4 text-sm text-cream/60">{site.tagline}</p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-col gap-3 sm:items-end">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm font-semibold tracking-wide text-cream/80 uppercase transition-colors hover:text-flame"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold tracking-wide text-orange uppercase transition-colors hover:text-flame"
                >
                  {site.instagramHandle}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-navy-line pt-6 text-xs text-cream/50 sm:text-sm">
          &copy; {new Date().getFullYear()} {site.name}
        </p>
      </div>
    </footer>
  );
}
