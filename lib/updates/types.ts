export const UPDATE_STATUSES = ["draft", "published"] as const;
export type UpdateStatus = (typeof UPDATE_STATUSES)[number];

export type UpdateRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: UpdateStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type UpdateImageRow = {
  id: string;
  update_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
};

/** An image with a freshly minted signed URL, ready to render. */
export type SignedImage = {
  id: string;
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
};

export type UpdateWithImages = UpdateRow & { images: SignedImage[] };

/** Admin list row — counts images without signing every URL. */
export type AdminUpdateSummary = UpdateRow & { imageCount: number };

/** What the editor sends back per image when an update is saved. */
export type PendingImage = {
  storagePath: string;
  altText: string;
  width: number | null;
  height: number | null;
};

export const IMAGE_BUCKET = "update-images";
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_UPDATE = 10;
/** Signed URLs outlive a page render comfortably without being long-lived. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
