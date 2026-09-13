"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { navLinks, site } from "@/lib/site";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  // Escape closes the mobile panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur supports-[backdrop-filter]:bg-navy/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-3"
          aria-label={`${site.name} — back to top`}
        >
          {/* The logo PNG has an opaque #030E29 background, which matches
              bg-navy exactly, so it reads as a transparent crest here. */}
          <Image
            src="/images/ahcd-logo.png"
            alt={`${site.name} logo`}
            width={1280}
            height={680}
            priority
            className="h-12 w-auto sm:h-14"
          />
          <span className="sr-only">{site.name}</span>
        </a>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm font-semibold tracking-wide text-cream/85 uppercase transition-colors hover:text-flame"
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
                className="rounded-sm border border-orange px-4 py-2 text-sm font-semibold tracking-wide text-orange uppercase transition-colors hover:bg-orange hover:text-navy"
              >
                Instagram
              </a>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="inline-flex items-center gap-2 rounded-sm border border-navy-line px-3 py-2 text-sm font-semibold tracking-wide text-cream uppercase md:hidden"
        >
          <span aria-hidden="true" className="text-base leading-none">
            {open ? "✕" : "☰"}
          </span>
          Menu
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-navy-line bg-navy md:hidden"
      >
        <nav aria-label="Mobile">
          <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {navLinks.map((link) => (
              <li key={link.href} className="border-b border-navy-line/60">
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-4 text-base font-semibold tracking-wide text-cream uppercase"
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
                onClick={() => setOpen(false)}
                className="block py-4 text-base font-semibold tracking-wide text-orange uppercase"
              >
                Instagram
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="flame-rule h-1 w-full" aria-hidden="true" />
    </header>
  );
}
