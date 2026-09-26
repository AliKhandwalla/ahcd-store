import { redirect } from "next/navigation";
import { getProductShareImage } from "@/lib/products/queries";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/products/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Stable sharing image for a published product, mirroring /og/update/[slug].
 *
 * Uploaded photos live in a private bucket behind short-lived signed URLs, so a
 * signed URL cannot be embedded in metadata. This gives each product one
 * permanent URL and resolves the image per request.
 *
 * The lookup filters on visibility = 'published' under the anonymous role, so
 * a hidden or archived product 404s here and its photos can never appear in a
 * social preview.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const image = await getProductShareImage(slug);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  // Repo images are already public assets; point the crawler straight at them.
  if (image.source === "local") {
    redirect(image.path);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUrl(image.path, 60);

  if (error || !data?.signedUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(data.signedUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
