"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import type { NavUser } from "@/lib/auth-user";
import { navLinks, site } from "@/lib/site";

export default function Navbar({
  user,
  isAdmin,
  signOutSlot,
  mobileSignOutSlot,
}: {
  /** Narrow projection only — never the full Supabase User object. */
  user: NavUser | null;
  /** Server-computed. A boolean crosses the boundary, never ADMIN_EMAIL. */
  isAdmin: boolean;
  signOutSlot: React.ReactNode;
  mobileSignOutSlot: React.ReactNode;
}) {
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
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label={`${site.name} — home`}
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
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-semibold tracking-wide text-cream/85 uppercase transition-colors hover:text-flame"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold tracking-wide text-cream/85 uppercase transition-colors hover:text-flame"
              >
                Instagram
              </a>
            </li>
            <li>
              {user ? (
                <AccountMenu
                  user={user}
                  isAdmin={isAdmin}
                  signOutSlot={signOutSlot}
                />
              ) : (
                <Link
                  href="/login"
                  className="rounded-sm border border-orange px-4 py-2 text-sm font-semibold tracking-wide text-orange uppercase transition-colors hover:bg-orange hover:text-navy"
                >
                  Sign In
                </Link>
              )}
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
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-4 text-base font-semibold tracking-wide text-cream uppercase"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="border-b border-navy-line/60">
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block py-4 text-base font-semibold tracking-wide text-cream uppercase"
              >
                Instagram
              </a>
            </li>

            {user ? (
              <>
                <li className="border-b border-navy-line/60 py-4">
                  <p className="truncate text-sm font-semibold text-cream">
                    {user.displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-cream/60">
                    {user.email}
                  </p>
                </li>
                <li className="border-b border-navy-line/60">
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="block py-4 text-base font-semibold tracking-wide text-flame uppercase"
                  >
                    Account
                  </Link>
                </li>
                {isAdmin && (
                  <li className="border-b border-navy-line/60">
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="block py-4 text-base font-semibold tracking-wide text-flame uppercase"
                    >
                      Admin
                    </Link>
                  </li>
                )}
                <li className="py-4">{mobileSignOutSlot}</li>
              </>
            ) : (
              <li className="py-4">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-sm border border-orange px-4 py-3 text-center text-base font-semibold tracking-wide text-orange uppercase"
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>

      <div className="flame-rule h-1 w-full" aria-hidden="true" />
    </header>
  );
}
