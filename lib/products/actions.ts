"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { slugCandidates } from "@/lib/updates/slug";
import {
  PRODUCT_IMAGE_BUCKET,
  isProductVisibility,
  type PendingProductImage,
  type ProductDetail,
  type ProductVisibility,
} from "@/lib/products/types";

export type ProductActionResult = { error: string } | undefined;

const POSTGRES_UNIQUE_VIOLATION = "23505";
const MAX_IMAGES = 8;
const MAX_DETAILS = 8;

type ParsedProduct = {
  name: string;
  summary: string;
  description: string;
  about: string;
  priceCents: number;
  visibility: ProductVisibility;
  sortOrder: number;
  mediaPadding: "tight" | "default";
  details: ProductDetail[];
  images: PendingProductImage[];
};

function parse(formData: FormData): ParsedProduct | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the product a name." };
  if (name.length > 200) return { error: "Name is too long (200 characters max)." };

  const priceRaw = String(formData.get("price") ?? "").trim();
  const priceNumber = Number(priceRaw);
  if (!priceRaw || Number.isNaN(priceNumber) || priceNumber < 0) {
    return { error: "Enter a price like 12.00." };
  }
  // Stored as integer minor units, matching how Square represents money.
  const priceCents = Math.round(priceNumber * 100);

  const visibilityRaw = String(formData.get("visibility") ?? "published");
  if (!isProductVisibility(visibilityRaw)) {
    return { error: "Pick a visibility." };
  }

  const paddingRaw = String(formData.get("mediaPadding") ?? "default");
  if (paddingRaw !== "tight" && paddingRaw !== "default") {
    return { error: "Pick an image framing option." };
  }

  const sortOrder = Number(String(formData.get("sortOrder") ?? "0"));

  let details: ProductDetail[] = [];
  try {
    const parsed: unknown = JSON.parse(String(formData.get("details") ?? "[]"));
    if (!Array.isArray(parsed)) throw new Error("not an array");
    details = parsed
      .slice(0, MAX_DETAILS)
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          label: String(item.label ?? "").slice(0, 60).trim(),
          value: String(item.value ?? "").slice(0, 300).trim(),
        };
      })
      .filter((detail) => detail.label && detail.value);
  } catch {
    return { error: "Those product details couldn't be read." };
  }

  let images: PendingProductImage[] = [];
  try {
    const parsed: unknown = JSON.parse(String(formData.get("images") ?? "[]"));
    if (!Array.isArray(parsed)) throw new Error("not an array");

    images = parsed.slice(0, MAX_IMAGES).map((entry) => {
      const item = entry as Record<string, unknown>;
      const source = item.source === "local" ? "local" : "storage";
      const path = String(item.path ?? "");
      // Never trust a client-supplied path to escape its expected location.
      if (!path || path.includes("..")) throw new Error("bad path");
      if (source === "local" && !path.startsWith("/images/")) {
        throw new Error("bad local path");
      }
      return {
        source,
        path,
        altText: String(item.altText ?? "").slice(0, 300),
        width: typeof item.width === "number" ? item.width : null,
        height: typeof item.height === "number" ? item.height : null,
      };
    });
  } catch {
    return { error: "Those images couldn't be read. Try re-adding them." };
  }

  return {
    name,
    summary: String(formData.get("summary") ?? "").trim().slice(0, 300),
    description: String(formData.get("description") ?? "").trim(),
    about: String(formData.get("about") ?? "").trim(),
    priceCents,
    visibility: visibilityRaw,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    mediaPadding: paddingRaw,
    details,
    images,
  };
}

async function writeImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  images: PendingProductImage[],
) {
  await supabase.from("product_images").delete().eq("product_id", productId);
  if (images.length === 0) return;

  await supabase.from("product_images").insert(
    images.map((image, index) => ({
      product_id: productId,
      source: image.source,
      path: image.path,
      alt_text: image.altText || null,
      sort_order: index,
      width: image.width,
      height: image.height,
    })),
  );
}

/** Public surfaces that show product data. Refreshed after every mutation. */
function revalidateProductSurfaces(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  if (slug) revalidatePath(`/products/${slug}`);
}

export async function createProduct(
  _prev: ProductActionResult,
  formData: FormData,
): Promise<ProductActionResult> {
  // Server actions are publicly reachable endpoints; the admin layout's check
  // does not protect them, so every action re-verifies independently.
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Not authorised." };

  const parsed = parse(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();

  let createdId: string | null = null;
  let createdSlug: string | null = null;

  for (const candidate of slugCandidates(parsed.name)) {
    const { data, error } = await supabase
      .from("products")
      .insert({
        slug: candidate,
        name: parsed.name,
        summary: parsed.summary,
        description: parsed.description,
        about: parsed.about,
        price_cents: parsed.priceCents,
        currency: "USD",
        visibility: parsed.visibility,
        sort_order: parsed.sortOrder,
        media_padding: parsed.mediaPadding,
        details: parsed.details,
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      createdId = data.id as string;
      createdSlug = data.slug as string;
      break;
    }
    if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) {
      return { error: "Couldn't save that product. Please try again." };
    }
  }

  if (!createdId || !createdSlug) {
    return { error: "Couldn't find a free URL for that name. Try a different one." };
  }

  await writeImages(supabase, createdId, parsed.images);
  revalidateProductSurfaces(createdSlug);
  redirect("/admin/products");
}

export async function saveProduct(
  _prev: ProductActionResult,
  formData: FormData,
): Promise<ProductActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Not authorised." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing product reference." };

  const parsed = parse(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { error: "That product no longer exists." };

  // The slug is frozen after creation so public URLs never break — exactly as
  // with updates. Renaming a product changes its title, not its address.
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.name,
      summary: parsed.summary,
      description: parsed.description,
      about: parsed.about,
      price_cents: parsed.priceCents,
      visibility: parsed.visibility,
      sort_order: parsed.sortOrder,
      media_padding: parsed.mediaPadding,
      details: parsed.details,
    })
    .eq("id", id);

  if (error) return { error: "Couldn't save that product. Please try again." };

  await writeImages(supabase, id, parsed.images);
  revalidateProductSurfaces(existing.slug as string);
  redirect("/admin/products");
}

/** Moves a product up or down in display order by swapping with its neighbour. */
export async function reorderProduct(formData: FormData): Promise<void> {
  const gate = await requireAdmin();
  if (!gate.ok) return;

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as { id: string; sort_order: number }[];
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return;

  // Rewrite the whole sequence so duplicate or sparse sort_order values from
  // manual edits can't make the swap a no-op.
  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  for (const [position, row] of reordered.entries()) {
    await supabase
      .from("products")
      .update({ sort_order: position })
      .eq("id", row.id);
  }

  revalidateProductSurfaces();
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const gate = await requireAdmin();
  if (!gate.ok) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  // Only uploaded objects need cleaning up; repo images are shared assets and
  // must never be deleted.
  const { data: imageRows } = await supabase
    .from("product_images")
    .select("source, path")
    .eq("product_id", id);

  const storagePaths = ((imageRows ?? []) as { source: string; path: string }[])
    .filter((row) => row.source === "storage")
    .map((row) => row.path);

  // Database row first, so the product stops being public immediately; storage
  // cleanup is best-effort afterwards. A failure leaves orphan files rather
  // than a live product pointing at deleted images.
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return;

  if (storagePaths.length > 0) {
    try {
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(storagePaths);
    } catch {
      // Unreferenced objects only. Nothing user-visible is broken.
    }
  }

  revalidateProductSurfaces(existing?.slug as string | undefined);
  redirect("/admin/products");
}
