/**
 * Single source of truth for the handful of real, verified brand facts used
 * across the landing page. Nothing here is invented — if a value is not
 * confirmed by Ali, it does not belong in this file or on the site.
 */
export const site = {
  name: "Ali’s Heat Crunch Delight",
  shortName: "AHCD",
  tagline: "Homemade chilli oil",
  instagramHandle: "@alis_heat_crunch_delight",
  instagramUrl: "https://instagram.com/alis_heat_crunch_delight",
} as const;

// Root-relative so they still work from /login and /account, not just from "/".
export const navLinks = [
  { href: "/#shop", label: "Shop" },
  { href: "/#story", label: "Our Story" },
  { href: "/updates", label: "Updates" },
] as const;
