import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccessDenied from "@/components/admin/AccessDenied";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "AHCD Admin",
  // Internal tool: keep it out of search results entirely.
  robots: { index: false, follow: false },
};

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/updates", label: "Updates" },
];

/**
 * Gates the whole /admin subtree. This is not the only check — every admin
 * server action re-verifies independently, because server actions are
 * publicly reachable endpoints that a layout cannot protect.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await requireAdmin();

  if (!gate.ok && gate.reason === "anon") redirect("/login");
  if (!gate.ok) return <AccessDenied />;

  return (
    <div className="flex min-h-dvh flex-col bg-[#faf9f6] text-navy">
      <header className="border-b border-navy-line bg-navy">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <span className="text-sm font-bold tracking-[0.16em] text-white uppercase">
            AHCD Admin
          </span>
          <nav aria-label="Admin" className="flex items-center gap-5">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-white/75 transition-colors hover:text-flame"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="text-sm font-medium text-white/75 transition-colors hover:text-flame"
            >
              View site
            </Link>
          </nav>
          <span className="ml-auto hidden text-xs text-white/50 sm:block">
            {gate.user.email}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
