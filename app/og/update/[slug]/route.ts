import { createClient } from "@/lib/supabase/server";
import { getShareImagePath } from "@/lib/updates/queries";
import { IMAGE_BUCKET } from "@/lib/updates/types";

/**
 * Stable sharing image for a published update.
 *
 * Storage is private and signed URLs expire within the hour, so a signed URL
 * cannot be embedded in Open Graph metadata — crawlers would fetch a dead link
 * later. This route gives each update one permanent URL and mints a fresh
 * signed URL server-side on every request.
 *
 * Draft privacy: the lookup filters on status = 'published' and runs under the
 * anonymous role, so RLS makes a draft simply not found. A draft slug 404s here
 * and its images can never appear in a social preview.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const path = await getShareImagePath(slug);
  if (!path) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, 60);

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
      // Crawlers re-fetch rarely; cache hard but allow revalidation.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
