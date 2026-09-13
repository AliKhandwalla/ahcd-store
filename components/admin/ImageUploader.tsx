"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_BUCKET,
  MAX_IMAGES_PER_UPDATE,
  MAX_IMAGE_BYTES,
} from "@/lib/updates/types";

export type EditorImage = {
  storagePath: string;
  altText: string;
  width: number | null;
  height: number | null;
  previewUrl: string;
};

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

/** Reads intrinsic dimensions so next/image can reserve the right aspect ratio. */
async function readDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export default function ImageUploader({
  images,
  onChange,
}: {
  images: EditorImage[];
  onChange: (next: EditorImage[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Files land under a per-editor-session temp prefix and stay there until the
  // update is saved. Nothing is written to update_images before that, so an
  // uploaded-but-unsaved object matches no read policy and is invisible.
  const sessionRef = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
  );

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const files = Array.from(fileList);
    const room = MAX_IMAGES_PER_UPDATE - images.length;

    if (room <= 0) {
      setError(`You can attach up to ${MAX_IMAGES_PER_UPDATE} images.`);
      return;
    }

    const accepted: File[] = [];
    for (const file of files.slice(0, room)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
        setError(`${file.name} isn't a JPEG, PNG or WebP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`${file.name} is larger than 5 MB.`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    setBusy(true);
    setProgress({ done: 0, total: accepted.length });

    const supabase = createClient();
    const added: EditorImage[] = [];

    for (const [index, file] of accepted.entries()) {
      const path = `tmp/${sessionRef.current}/${crypto.randomUUID()}.${extensionFor(file)}`;

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError(`Couldn't upload ${file.name}. Please try again.`);
        continue;
      }

      const { data: signed } = await supabase.storage
        .from(IMAGE_BUCKET)
        .createSignedUrl(path, 60 * 60);

      const { width, height } = await readDimensions(file);

      added.push({
        storagePath: path,
        altText: "",
        width,
        height,
        previewUrl: signed?.signedUrl ?? "",
      });

      setProgress({ done: index + 1, total: accepted.length });
    }

    if (added.length > 0) onChange([...images, ...added]);

    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(index: number) {
    const target = images[index];
    onChange(images.filter((_, i) => i !== index));

    // Delete straight away so abandoning an image doesn't leave it behind.
    try {
      const supabase = createClient();
      await supabase.storage.from(IMAGE_BUCKET).remove([target.storagePath]);
    } catch {
      // Orphan only — the row was never created, so nothing is broken.
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function setAlt(index: number, altText: string) {
    onChange(images.map((img, i) => (i === index ? { ...img, altText } : img)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id="image-input"
          type="file"
          accept={ACCEPT}
          multiple
          disabled={busy}
          onChange={(event) => handleFiles(event.target.files)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy hover:file:border-navy sm:w-auto"
        />
        {progress && (
          <span
            role="status"
            className="text-sm text-slate-600 tabular-nums"
          >
            Uploading {progress.done}/{progress.total}…
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-slate-500">
        JPEG, PNG or WebP · up to 5 MB each · {MAX_IMAGES_PER_UPDATE} images max
      </p>

      {error && (
        <p
          role="alert"
          className="mt-2 border-l-2 border-orange bg-orange/5 px-3 py-2 text-sm text-orange-deep"
        >
          {error}
        </p>
      )}

      {images.length > 0 && (
        <ul className="mt-4 space-y-2">
          {images.map((image, index) => (
            <li
              key={image.storagePath}
              className="flex flex-col gap-3 border border-slate-200 bg-white p-3 sm:flex-row sm:items-start"
            >
              <div className="relative h-20 w-28 shrink-0 overflow-hidden border border-slate-200 bg-slate-50">
                {image.previewUrl && (
                  <Image
                    src={image.previewUrl}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`alt-${index}`}
                  className="block text-xs font-medium text-slate-600"
                >
                  Alt text{" "}
                  <span className="font-normal text-slate-400">
                    (describes the image for screen readers)
                  </span>
                </label>
                <input
                  id={`alt-${index}`}
                  type="text"
                  value={image.altText}
                  onChange={(event) => setAlt(index, event.target.value)}
                  placeholder="A jar of chilli oil on a kitchen counter"
                  className="mt-1 w-full border border-slate-300 px-2 py-1.5 text-sm text-navy focus:border-navy focus:outline-none"
                />
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move image ${index + 1} earlier`}
                  className="border border-slate-300 px-2 py-1 text-sm text-navy disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  aria-label={`Move image ${index + 1} later`}
                  className="border border-slate-300 px-2 py-1 text-sm text-navy disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="border border-slate-300 px-2 py-1 text-sm text-orange-deep hover:border-orange"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
