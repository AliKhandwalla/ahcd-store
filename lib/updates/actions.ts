"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { slugCandidates } from "@/lib/updates/slug";
import {
  IMAGE_BUCKET,
  MAX_IMAGES_PER_UPDATE,
  UPDATE_STATUSES,
  type PendingImage,
  type UpdateStatus,
} from "@/lib/updates/types";

export type ActionResult = { error: string } | undefined;

const POSTGRES_UNIQUE_VIOLATION = "23505";

type ParsedForm = {
  title: string;
  description: string;
  status: UpdateStatus;
  images: PendingImage[];
};

function parseForm(formData: FormData): ParsedForm | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "draft");

  if (!title) return { error: "Give the update a title." };
  if (title.length > 200) return { error: "Title is too long (200 characters max)." };
  if (!description) return { error: "Add some body text." };

  if (!UPDATE_STATUSES.includes(rawStatus as UpdateStatus)) {
    return { error: "Pick either Draft or Published." };
  }

  let images: PendingImage[] = [];
  try {
    const raw = String(formData.get("images") ?? "[]");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");

    images = parsed.slice(0, MAX_IMAGES_PER_UPDATE).map((entry) => {
      const item = entry as Record<string, unknown>;
      const storagePath = String(item.storagePath ?? "");
      // Never trust a client-supplied path to point outside the bucket.
      if (!storagePath || storagePath.includes("..")) {
        throw new Error("bad path");
      }
      return {
        storagePath,
        altText: String(item.altText ?? "").slice(0, 300),
        width: typeof item.width === "number" ? item.width : null,
        height: typeof item.height === "number" ? item.height : null,
      };
    });
  } catch {
    return { error: "Those images couldn't be read. Try re-adding them." };
  }

  return { title, description, status: rawStatus as UpdateStatus, images };
}

/** Replaces an update's image rows with exactly what the editor submitted. */
async function writeImageRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  updateId: string,
  images: PendingImage[],
) {
  await supabase.from("update_images").delete().eq("update_id", updateId);

  if (images.length === 0) return;

  await supabase.from("update_images").insert(
    images.map((image, index) => ({
      update_id: updateId,
      storage_path: image.storagePath,
      alt_text: image.altText || null,
      sort_order: index,
      width: image.width,
      height: image.height,
    })),
  );
}

function revalidateEverywhere(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/updates");
  revalidatePath("/updates");
  revalidatePath("/");
  if (slug) revalidatePath(`/updates/${slug}`);
}

export async function createUpdate(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Not authorised." };

  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const publishedAt =
    parsed.status === "published" ? new Date().toISOString() : null;

  // Try base slug, then base-2, base-3 … Letting the unique index arbitrate
  // means two concurrent creates can never end up with the same slug.
  let createdSlug: string | null = null;
  let createdId: string | null = null;

  for (const candidate of slugCandidates(parsed.title)) {
    const { data, error } = await supabase
      .from("updates")
      .insert({
        title: parsed.title,
        slug: candidate,
        description: parsed.description,
        status: parsed.status,
        published_at: publishedAt,
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      createdId = data.id as string;
      createdSlug = data.slug as string;
      break;
    }
    if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) {
      return { error: "Couldn't save that update. Please try again." };
    }
  }

  if (!createdId || !createdSlug) {
    return { error: "Couldn't find a free URL for that title. Try a different one." };
  }

  await writeImageRows(supabase, createdId, parsed.images);
  revalidateEverywhere(createdSlug);
  redirect("/admin/updates");
}

export async function saveUpdate(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Not authorised." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing update reference." };

  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("updates")
    .select("slug, published_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { error: "That update no longer exists." };

  // Slug is frozen at creation, so links shared earlier never break.
  // published_at is stamped on the first publish and then retained, so
  // unpublishing and republishing keeps the original date.
  const publishedAt =
    parsed.status === "published"
      ? ((existing.published_at as string | null) ?? new Date().toISOString())
      : (existing.published_at as string | null);

  const { error } = await supabase
    .from("updates")
    .update({
      title: parsed.title,
      description: parsed.description,
      status: parsed.status,
      published_at: publishedAt,
    })
    .eq("id", id);

  if (error) return { error: "Couldn't save that update. Please try again." };

  await writeImageRows(supabase, id, parsed.images);
  revalidateEverywhere(existing.slug as string);
  redirect("/admin/updates");
}

export async function deleteUpdate(formData: FormData): Promise<void> {
  const gate = await requireAdmin();
  if (!gate.ok) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("updates")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { data: imageRows } = await supabase
    .from("update_images")
    .select("storage_path")
    .eq("update_id", id);

  const paths = (imageRows ?? []).map(
    (row) => (row as { storage_path: string }).storage_path,
  );

  // Delete the database row FIRST. Cascade clears update_images, so the update
  // stops being publicly visible immediately. Storage cleanup is best-effort
  // afterwards: if it fails we are left with unreferenced orphan files, which
  // is strictly better than a live update pointing at deleted images.
  const { error } = await supabase.from("updates").delete().eq("id", id);
  if (error) return;

  if (paths.length > 0) {
    try {
      await supabase.storage.from(IMAGE_BUCKET).remove(paths);
    } catch {
      // Orphaned objects only. Nothing user-visible is broken.
    }
  }

  revalidateEverywhere(existing?.slug as string | undefined);
  redirect("/admin/updates");
}
