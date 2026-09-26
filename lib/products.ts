/**
 * The single source of truth for AHCD product information.
 *
 * Nothing else in the application hard-codes a product name, price or
 * description — the catalogue, the detail pages and the homepage all read from
 * here.
 *
 * FUTURE: this is shaped so a read-only Square Catalog integration can replace
 * the local array without touching any component:
 *   - the accessors are already async, so callers await them today and would
 *     await a network fetch tomorrow unchanged;
 *   - money is an integer in minor units plus a currency code, matching how
 *     Square represents money, so prices never need re-modelling.
 * This milestone deliberately makes no Square API calls.
 */

export type ProductImage = {
  src: string;
  /** Intrinsic size, so next/image reserves the right space and never crops. */
  width: number;
  height: number;
  alt: string;
};

/** Extra factual information, rendered as a description list. Never a control. */
export type ProductDetail = {
  label: string;
  value: string;
};

/**
 * How tightly the image sits inside its media box. Images are always fitted
 * whole (never cropped); this only tunes the surrounding breathing room, since
 * a photo that already carries its own margins needs less than one that doesn't.
 */
export type MediaPadding = "tight" | "default";

export type Product = {
  slug: string;
  name: string;
  /** One short line used on cards and in metadata. */
  summary: string;
  description: string;
  priceCents: number;
  currency: "USD";
  /** null renders the branded placeholder — see the Mediterranean entry. */
  image: ProductImage | null;
  mediaPadding: MediaPadding;
  details: ProductDetail[];
};

const PRODUCTS: Product[] = [
  {
    slug: "original",
    name: "Ali's Heat Crunch Delight",
    summary: "The original — bold heat, serious crunch.",
    description:
      "The original AHCD homemade chilli oil — bold heat, serious crunch, and made in small batches.",
    priceCents: 1200,
    currency: "USD",
    image: {
      src: "/images/ahcd-product-jar.jpg",
      width: 1280,
      height: 617,
      alt: "A jar of Ali's Heat Crunch Delight chilli oil beside its lid, which shows the AHCD logo label.",
    },
    // Wide 2.07:1 photo. Kept tight so it fills as much of the box as possible
    // rather than floating in the middle of it.
    mediaPadding: "tight",
    details: [],
  },
  {
    slug: "mediterranean",
    name: "Mediterranean Crunch",
    summary: "Our signature heat and crunch, Mediterranean-inspired.",
    description:
      "A Mediterranean-inspired take on AHCD, combining our signature heat and crunch with Mediterranean flavors.",
    priceCents: 1500,
    currency: "USD",
    // TO ADD THE REAL PHOTO: drop the file into public/images/ and replace null
    // with, for example:
    //   image: {
    //     src: "/images/ahcd-mediterranean.jpg",
    //     width: 1600,
    //     height: 1200,
    //     alt: "A jar of AHCD Mediterranean Crunch chilli oil.",
    //   },
    // No component changes are needed — the placeholder disappears on its own.
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
    priceCents: 2500,
    currency: "USD",
    image: {
      src: "/images/ahcd-shirt.png",
      width: 1086,
      height: 1448,
      alt: "A black Ali's Heat Crunch Delight T-shirt printed with the AHCD crest and the words Homemade Chilli Oil.",
    },
    // The photograph already carries generous white margins of its own, and its
    // white background meets the white media surface seamlessly, so additional
    // padding would only shrink the shirt.
    mediaPadding: "tight",
    details: [{ label: "Sizes", value: "Small, Medium, Large, XL" }],
  },
];

export function formatPrice(product: Pick<Product, "priceCents" | "currency">) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency,
  }).format(product.priceCents / 100);
}

export async function getProducts(): Promise<Product[]> {
  return PRODUCTS;
}

export async function getProduct(slug: string): Promise<Product | null> {
  return PRODUCTS.find((product) => product.slug === slug) ?? null;
}

/** Everything except the given slug — used for the homepage's compact row. */
export async function getProductsExcept(slug: string): Promise<Product[]> {
  return PRODUCTS.filter((product) => product.slug !== slug);
}
