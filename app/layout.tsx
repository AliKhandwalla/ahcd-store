import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SignOutButton from "@/components/SignOutButton";
import { toNavUser } from "@/lib/auth-user";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Prefers the Vercel-provided URL on preview deploys, falls back to the
// production domain so Open Graph image URLs always resolve absolutely.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
  : "https://alisheatcrunchdelight.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ali's Heat Crunch Delight — Homemade Chilli Oil",
  description:
    "Ali's Heat Crunch Delight is a homemade chilli oil made in small batches by Ali. Crunch with a kick, for the meals you already love.",
  openGraph: {
    title: "Ali's Heat Crunch Delight — Homemade Chilli Oil",
    description:
      "A homemade chilli oil made in small batches by Ali. Crunch with a kick.",
    type: "website",
    images: [
      {
        url: "/images/ahcd-product-jar.jpg",
        width: 1280,
        height: 617,
        alt: "A jar of Ali's Heat Crunch Delight chilli oil beside its lid, showing the AHCD logo label.",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only the three fields the navbar draws cross into client components.
  const navUser = user ? toNavUser(user) : null;

  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      {/* Flex column so short routes (/login, /account, auth errors) still push
          the footer to the bottom instead of leaving a navy gap beneath it. */}
      <body className="flex min-h-dvh flex-col">
        <Navbar
          user={navUser}
          signOutSlot={
            <SignOutButton className="text-sm font-semibold tracking-wide text-cream/80 uppercase transition-colors hover:text-orange" />
          }
          mobileSignOutSlot={
            <SignOutButton className="block w-full rounded-sm border border-cream/25 px-4 py-3 text-center text-base font-semibold tracking-wide text-cream uppercase" />
          }
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
