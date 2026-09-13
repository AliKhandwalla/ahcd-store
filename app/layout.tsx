import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
