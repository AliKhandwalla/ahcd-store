import Link from "next/link";

/** Plain, non-marketing 403. Reveals nothing about who the admin is. */
export default function AccessDenied() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#faf9f6] px-4 py-16">
      <div className="w-full max-w-md border border-slate-300 bg-white p-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-orange-deep uppercase">
          403
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy">Access denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your account doesn&rsquo;t have access to the AHCD admin area. If you
          think that&rsquo;s wrong, sign in with the account that owns the shop.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center border border-navy bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-soft"
          >
            Back to the shop
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center border border-slate-300 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-navy"
          >
            Your account
          </Link>
        </div>
      </div>
    </main>
  );
}
