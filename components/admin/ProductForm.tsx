"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import ImageUploader, {
  type EditorImage,
} from "@/components/admin/ImageUploader";
import type { ProductActionResult } from "@/lib/products/actions";
import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VISIBILITIES,
  VISIBILITY_LABELS,
  type MediaPadding,
  type ProductDetail,
  type ProductVisibility,
} from "@/lib/products/types";

/** An image in the editor, tagged with where its bytes live. */
export type ProductEditorImage = EditorImage & { source: "local" | "storage" };

type Props = {
  action: (
    prev: ProductActionResult,
    formData: FormData,
  ) => Promise<ProductActionResult>;
  initial?: {
    id: string;
    slug: string;
    name: string;
    summary: string;
    description: string;
    about: string;
    price: string;
    visibility: ProductVisibility;
    sortOrder: number;
    mediaPadding: MediaPadding;
    details: ProductDetail[];
    images: ProductEditorImage[];
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center border border-navy bg-navy px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-soft disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save product"}
    </button>
  );
}

export default function ProductForm({ action, initial }: Props) {
  const [state, formAction] = useActionState<ProductActionResult, FormData>(
    action,
    undefined,
  );

  const [images, setImages] = useState<ProductEditorImage[]>(
    initial?.images ?? [],
  );
  const [details, setDetails] = useState<ProductDetail[]>(
    initial?.details ?? [],
  );
  const [visibility, setVisibility] = useState<ProductVisibility>(
    initial?.visibility ?? "published",
  );

  // Repo images (source "local") are shared assets referenced by path. The
  // uploader only ever produces "storage" images, so anything it returns is
  // tagged accordingly while existing local rows are preserved as-is.
  const uploaderImages: EditorImage[] = images;
  const handleUploaderChange = (next: EditorImage[]) => {
    setImages(
      next.map((image) => {
        const existing = images.find(
          (candidate) => candidate.storagePath === image.storagePath,
        );
        return { ...image, source: existing?.source ?? "storage" };
      }),
    );
  };

  return (
    <form action={formAction} className="max-w-3xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input
        type="hidden"
        name="images"
        value={JSON.stringify(
          images.map((image) => ({
            source: image.source,
            path: image.storagePath,
            altText: image.altText,
            width: image.width,
            height: image.height,
          })),
        )}
      />
      <input type="hidden" name="details" value={JSON.stringify(details)} />

      {state?.error && (
        <p
          role="alert"
          className="mb-4 border-l-2 border-orange bg-orange/5 px-3 py-2 text-sm text-orange-deep"
        >
          {state.error}
        </p>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-navy">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={200}
            defaultValue={initial?.name}
            className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
          />
          {initial && (
            <p className="mt-1 text-xs text-slate-500">
              URL: <code className="text-slate-600">/products/{initial.slug}</code>{" "}
              — fixed when the product was created, so existing links keep working.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-navy"
            >
              Price (USD)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={initial?.price}
              className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown as the in-person price. No online ordering is enabled.
            </p>
          </div>

          <div>
            <label
              htmlFor="sortOrder"
              className="block text-sm font-medium text-navy"
            >
              Display order
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              step="1"
              defaultValue={initial?.sortOrder ?? 0}
              className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Lower numbers appear first.
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-navy"
          >
            Short summary
          </label>
          <input
            id="summary"
            name="summary"
            type="text"
            maxLength={300}
            defaultValue={initial?.summary}
            className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            One line, used on catalogue cards.
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-navy"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description}
            className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm leading-relaxed text-navy focus:border-navy focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="about" className="block text-sm font-medium text-navy">
            &ldquo;What it&rsquo;s like&rdquo;
          </label>
          <textarea
            id="about"
            name="about"
            rows={5}
            defaultValue={initial?.about}
            className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm leading-relaxed text-navy focus:border-navy focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            The longer paragraph on the product page. Keep it factual — no
            ingredients, jar sizes or heat ratings unless they&rsquo;re true.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-navy">Photos</legend>
          <div className="mt-2">
            <ImageUploader
              images={uploaderImages}
              onChange={handleUploaderChange}
              bucket={PRODUCT_IMAGE_BUCKET}
              maxImages={8}
            />
          </div>
        </fieldset>

        <ProductDetailsEditor details={details} onChange={setDetails} />

        <div>
          <label
            htmlFor="mediaPadding"
            className="block text-sm font-medium text-navy"
          >
            Image framing
          </label>
          <select
            id="mediaPadding"
            name="mediaPadding"
            defaultValue={initial?.mediaPadding ?? "default"}
            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none sm:w-64"
          >
            <option value="tight">Tight — photo fills more of the frame</option>
            <option value="default">Default — more breathing room</option>
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-navy">Visibility</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {PRODUCT_VISIBILITIES.map((value) => (
              <label
                key={value}
                className="inline-flex items-center gap-2 text-sm text-navy"
              >
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                />
                {VISIBILITY_LABELS[value]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {visibility === "published"
              ? "Live on the website."
              : visibility === "hidden"
                ? "Off the website, still editable here. Nothing is deleted."
                : "Set aside. Off the website and out of the way, but kept."}
          </p>
        </fieldset>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
        <SubmitButton />
        {initial && (
          <Link
            href={`/products/${initial.slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue hover:underline"
          >
            Preview
          </Link>
        )}
        <Link
          href="/admin/products"
          className="text-sm font-medium text-slate-600 hover:text-navy"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

/** Small repeating label/value editor for informational details. */
function ProductDetailsEditor({
  details,
  onChange,
}: {
  details: ProductDetail[];
  onChange: (next: ProductDetail[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-navy">
        Product details
      </legend>
      <p className="text-xs text-slate-500">
        Informational only, shown as a list. For example Sizes &rarr; Small,
        Medium, Large, XL.
      </p>

      {details.length > 0 && (
        <ul className="mt-2 space-y-2">
          {details.map((detail, index) => (
            <li key={index} className="flex flex-wrap gap-2">
              <input
                type="text"
                aria-label={`Detail ${index + 1} label`}
                value={detail.label}
                placeholder="Sizes"
                onChange={(event) =>
                  onChange(
                    details.map((item, i) =>
                      i === index ? { ...item, label: event.target.value } : item,
                    ),
                  )
                }
                className="w-32 border border-slate-300 px-2 py-1.5 text-sm text-navy focus:border-navy focus:outline-none"
              />
              <input
                type="text"
                aria-label={`Detail ${index + 1} value`}
                value={detail.value}
                placeholder="Small, Medium, Large, XL"
                onChange={(event) =>
                  onChange(
                    details.map((item, i) =>
                      i === index ? { ...item, value: event.target.value } : item,
                    ),
                  )
                }
                className="min-w-0 flex-1 border border-slate-300 px-2 py-1.5 text-sm text-navy focus:border-navy focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onChange(details.filter((_, i) => i !== index))}
                className="border border-slate-300 px-2 py-1 text-sm text-orange-deep hover:border-orange"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...details, { label: "", value: "" }])}
        className="mt-2 border border-slate-300 px-3 py-1.5 text-sm font-medium text-navy hover:border-navy"
      >
        Add detail
      </button>
    </fieldset>
  );
}
