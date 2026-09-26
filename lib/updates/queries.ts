import { createClient } from "@/lib/supabase/server";
import { isEventExpired } from "@/lib/updates/time";
import {
  IMAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  type AdminUpdateSummary,
  type SignedImage,
  type UpdateCategory,
  type UpdateImageRow,
  type UpdateRow,
  type UpdateWithImages,
} from "@/lib/updates/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Turns storage paths into short-lived signed URLs.
 *
 * The bucket is private, so this is the only way an image becomes viewable.
 * Signing is authorised by the storage SELECT policy, which only matches
 * objects attached to a *published* update — so an unpublished update's images
 * simply fail to sign and are dropped here rather than leaking.
 */
async function signImages(
  supabase: SupabaseClient,
  rows: UpdateImageRow[],
): Promise<SignedImage[]> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  if (error || !data) return [];

  const urlByPath = new Map<string, string>();
  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) urlByPath.set(entry.path, entry.signedUrl);
  });

  return rows
    .map((row) => {
      const url = urlByPath.get(row.storage_path);
      if (!url) return null;
      return {
        id: row.id,
        url,
        altText: row.alt_text ?? "",
        width: row.width,
        height: row.height,
      } satisfies SignedImage;
    })
    .filter((image): image is SignedImage => image !== null);
}

/** Published updates, newest first. Used by /updates and the homepage strip. */
export async function listPublishedUpdates(
  limit?: number,
  category?: UpdateCategory,
) {
  const supabase = await createClient();

  // RLS already hides drafts; the explicit filter is defence in depth.
  let query = supabase
    .from("updates")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Chronological order is never disturbed — this only narrows the set.
  if (category) query = query.eq("category", category);

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error || !data) return [];

  const updates = data as UpdateRow[];
  if (updates.length === 0) return [];

  const { data: imageRows } = await supabase
    .from("update_images")
    .select("*")
    .in(
      "update_id",
      updates.map((u) => u.id),
    )
    .order("sort_order", { ascending: true });

  const rows = (imageRows ?? []) as UpdateImageRow[];
  const signed = await signImages(supabase, rows);
  const signedById = new Map(signed.map((image) => [image.id, image]));

  return updates.map((update) => ({
    ...update,
    images: rows
      .filter((row) => row.update_id === update.id)
      .map((row) => signedById.get(row.id))
      .filter((image): image is SignedImage => Boolean(image)),
  })) satisfies UpdateWithImages[];
}

/** A single published update by slug. Returns null for drafts and misses. */
export async function getPublishedUpdateBySlug(
  slug: string,
): Promise<UpdateWithImages | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("updates")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  const update = data as UpdateRow;

  const { data: imageRows } = await supabase
    .from("update_images")
    .select("*")
    .eq("update_id", update.id)
    .order("sort_order", { ascending: true });

  const rows = (imageRows ?? []) as UpdateImageRow[];
  return { ...update, images: await signImages(supabase, rows) };
}

/**
 * The featured update, if there is one worth promoting right now.
 *
 * Returns null for an expired market event: a past event stops being promoted
 * but stays published and stays in the archive. Nothing is hidden or deleted.
 */
export async function getFeaturedUpdate(): Promise<UpdateWithImages | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("updates")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .maybeSingle();

  if (error || !data) return null;
  const update = data as UpdateRow;

  if (isEventExpired(update.event_start_at, update.event_end_at)) return null;

  const { data: imageRows } = await supabase
    .from("update_images")
    .select("*")
    .eq("update_id", update.id)
    .order("sort_order", { ascending: true });

  const rows = (imageRows ?? []) as UpdateImageRow[];
  return { ...update, images: await signImages(supabase, rows) };
}

/** Storage path of a published update's first image, for the sharing route. */
export async function getShareImagePath(slug: string): Promise<string | null> {
  const supabase = await createClient();

  // Goes through the same published-only filter, so a draft is simply not
  // found and its images can never surface in a social preview.
  const { data: update } = await supabase
    .from("updates")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!update) return null;

  const { data } = await supabase
    .from("update_images")
    .select("storage_path")
    .eq("update_id", (update as { id: string }).id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as { storage_path: string } | null)?.storage_path ?? null;
}

// --- Admin-side reads. RLS grants these only to the admin. ------------------

export async function listAllUpdates(): Promise<AdminUpdateSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("updates")
    .select("*, update_images(id)")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return (data as (UpdateRow & { update_images: { id: string }[] })[]).map(
    ({ update_images, ...update }) => ({
      ...update,
      imageCount: update_images?.length ?? 0,
    }),
  );
}

/** One update plus its images, for the edit form. Signs URLs as the admin. */
export async function getUpdateForEdit(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("updates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const update = data as UpdateRow;

  const { data: imageRows } = await supabase
    .from("update_images")
    .select("*")
    .eq("update_id", id)
    .order("sort_order", { ascending: true });

  const rows = (imageRows ?? []) as UpdateImageRow[];

  // The admin can read every object in the bucket, so drafts sign fine here.
  const { data: signedData } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map<string, string>();
  (signedData ?? []).forEach((entry) => {
    if (entry.signedUrl && entry.path) urlByPath.set(entry.path, entry.signedUrl);
  });

  return {
    update,
    images: rows.map((row) => ({
      storagePath: row.storage_path,
      altText: row.alt_text ?? "",
      width: row.width,
      height: row.height,
      previewUrl: urlByPath.get(row.storage_path) ?? "",
    })),
  };
}
