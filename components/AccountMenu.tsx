"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { initialsFor, type NavUser } from "@/lib/auth-user";

export default function AccountMenu({
  user,
  signOutSlot,
}: {
  user: NavUser;
  /** Server-rendered sign-out form, passed through so the action stays server-side. */
  signOutSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="account-menu"
        className="flex items-center gap-2 rounded-sm border border-navy-line px-2 py-1.5 transition-colors hover:border-orange"
      >
        <AvatarMark user={user} />
        <span className="max-w-[8rem] truncate text-sm font-semibold tracking-wide text-cream/85 uppercase">
          {user.displayName}
        </span>
        <span aria-hidden="true" className="text-[0.6rem] text-cream/60">
          {open ? "▲" : "▼"}
        </span>
      </button>

      <div
        id="account-menu"
        hidden={!open}
        className="absolute right-0 z-50 mt-2 w-64 border border-navy-line bg-navy shadow-2xl shadow-black/60"
      >
        <div className="border-b border-navy-line px-4 py-3">
          <p className="truncate text-sm font-semibold text-cream">
            {user.displayName}
          </p>
          <p className="mt-0.5 truncate text-xs text-cream/60">{user.email}</p>
        </div>

        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className="block px-4 py-3 text-sm font-semibold tracking-wide text-cream uppercase transition-colors hover:bg-navy-soft hover:text-flame"
        >
          Account
        </Link>

        <div className="border-t border-navy-line px-4 py-3">{signOutSlot}</div>
      </div>
    </div>
  );
}

function AvatarMark({ user }: { user: NavUser }) {
  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt=""
        width={64}
        height={64}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-bold text-navy"
    >
      {initialsFor(user.displayName)}
    </span>
  );
}
