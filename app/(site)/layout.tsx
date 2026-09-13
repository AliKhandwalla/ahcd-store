import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SignOutButton from "@/components/SignOutButton";
import { isAdminEmail } from "@/lib/admin/auth";
import { toNavUser } from "@/lib/auth-user";
import { createClient } from "@/lib/supabase/server";

/**
 * Storefront chrome. Lives here rather than in the root layout so /admin can
 * render its own internal-tool chrome instead.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only the three fields the navbar draws cross into client components.
  const navUser = user ? toNavUser(user) : null;
  // Computed server-side from the server-only ADMIN_EMAIL. The browser receives
  // a boolean, never the admin address — and hiding the link is cosmetic
  // anyway, since /admin re-checks on the server.
  const isAdmin = Boolean(user && isAdminEmail(user.email));

  return (
    <>
      <Navbar
        user={navUser}
        isAdmin={isAdmin}
        signOutSlot={
          <SignOutButton className="text-sm font-semibold tracking-wide text-cream/80 uppercase transition-colors hover:text-orange" />
        }
        mobileSignOutSlot={
          <SignOutButton className="block w-full rounded-sm border border-cream/25 px-4 py-3 text-center text-base font-semibold tracking-wide text-cream uppercase" />
        }
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
