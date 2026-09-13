import Image from "next/image";
import type { SignedImage } from "@/lib/updates/types";

/**
 * Renders images at their own aspect ratio rather than forcing a shared crop.
 *
 * Where width/height were captured at upload, next/image reserves the exact
 * ratio so nothing shifts and nothing is cropped. Where they are missing (older
 * rows, or a browser that couldn't decode the file), the image falls back to a
 * contained frame with a max height — still uncropped, just capped.
 */
export default function UpdateGallery({ images }: { images: SignedImage[] }) {
  if (images.length === 0) return null;

  return (
    <div className="mt-12 space-y-8">
      {images.map((image) => (
        <figure key={image.id}>
          {image.width && image.height ? (
            <Image
              src={image.url}
              alt={image.altText}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1024px) 48rem, 92vw"
              className="h-auto w-full border border-navy-line"
              unoptimized
            />
          ) : (
            <div className="relative h-[60vh] max-h-[32rem] w-full border border-navy-line">
              <Image
                src={image.url}
                alt={image.altText}
                fill
                sizes="(min-width: 1024px) 48rem, 92vw"
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          {image.altText && (
            <figcaption className="mt-2 text-sm text-cream/55">
              {image.altText}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
