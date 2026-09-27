import type { Product } from "@/lib/products/types";

/**
 * EMERGENCY FALLBACK ONLY.
 *
 * Supabase is the source of truth for products. This copy exists so that a
 * database outage renders the real catalogue instead of an empty storefront —
 * it is never consulted while the database is reachable.
 *
 * Because it is a copy, it will drift from the database as products are edited
 * in the admin. That is accepted: it only has to be approximately right on the
 * rare occasion it is used. If a product is added or removed permanently, it is
 * worth updating this list to match.
 */
export const FALLBACK_PRODUCTS: Product[] = [
  {
    slug: "original",
    name: "Ali's Heat Crunch Delight",
    summary: "The original — bold heat, serious crunch.",
    description:
      "The original AHCD homemade chilli oil — bold heat, serious crunch, and made in small batches.",
    about:
      "This is the jar AHCD started with. Ali makes it at home in small batches and fills and labels the jars by hand, so no two runs are ever quite identical. It's built to go on top of food you're already cooking — eggs, rice, noodles, whatever's in front of you.",
    priceCents: 1200,
    currency: "USD",
    image: {
      src: "/images/ahcd-jar.webp",
      width: 1254,
      height: 1254,
      alt: "A jar of Ali's Heat Crunch Delight chilli oil, filled with chilli in oil and labelled with the AHCD crest.",
    },
    mediaPadding: "tight",
    details: [],
  },
  {
    slug: "mediterranean",
    name: "Mediterranean Crunch",
    summary: "Our signature heat and crunch, Mediterranean-inspired.",
    description:
      "A Mediterranean-inspired take on AHCD, combining our signature heat and crunch with Mediterranean flavors.",
    about:
      "A newer addition to the range, taking the same heat and crunch in a Mediterranean-inspired direction. Made the same way as the original — small batches, jarred by hand. We haven't photographed this one yet, so the crest is standing in until we do.",
    priceCents: 1500,
    currency: "USD",
    image: null,
    mediaPadding: "default",
    details: [],
  },
  {
    slug: "t-shirt",
    name: "Ali's Heat Crunch T-Shirt",
    summary: "Official AHCD T-shirt featuring the brand crest.",
    description:
      "Official Ali's Heat Crunch Delight T-shirt featuring the AHCD brand.",
    about:
      "The same crest that's on every jar, printed on a black tee. It's for anyone who wants to carry a bit of AHCD around with them, and it's how you'll spot us at a market. Available in Small, Medium, Large and XL.",
    priceCents: 2500,
    currency: "USD",
    image: {
      src: "/images/ahcd-shirt.webp",
      width: 1086,
      height: 1448,
      alt: "A black Ali's Heat Crunch Delight T-shirt printed with the AHCD crest and the words Homemade Chilli Oil.",
    },
    mediaPadding: "tight",
    details: [{ label: "Sizes", value: "Small, Medium, Large, XL" }],
  },
];
