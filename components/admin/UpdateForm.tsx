"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import ImageUploader, { type EditorImage } from "@/components/admin/ImageUploader";
import type { ActionResult } from "@/lib/updates/actions";
import type { UpdateStatus } from "@/lib/updates/types";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  initial?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    status: UpdateStatus;
    images: EditorImage[];
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
      {pending ? "Saving…" : "Save update"}
    </button>
  );
}

export default function UpdateForm({ action, initial }: Props) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    action,
    undefined,
  );
  const [images, setImages] = useState<EditorImage[]>(initial?.images ?? []);
  const [status, setStatus] = useState<UpdateStatus>(initial?.status ?? "draft");

  return (
    <form action={formAction} className="max-w-3xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {/* Image metadata travels as JSON; rows are only written server-side. */}
      <input
        type="hidden"
        name="images"
        value={JSON.stringify(
          images.map(({ storagePath, altText, width, height }) => ({
            storagePath,
            altText,
            width,
            height,
          })),
        )}
      />

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
          <label htmlFor="title" className="block text-sm font-medium text-navy">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={initial?.title}
            className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
          />
          {initial && (
            <p className="mt-1 text-xs text-slate-500">
              URL: <code className="text-slate-600">/updates/{initial.slug}</code>{" "}
              — fixed when the update was created, so existing links keep working.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-navy"
          >
            Body
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={10}
            defaultValue={initial?.description}
            className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm leading-relaxed text-navy focus:border-navy focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Plain text. Leave a blank line between paragraphs — the site handles
            all formatting and spacing.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-navy">Images</legend>
          <div className="mt-2">
            <ImageUploader images={images} onChange={setImages} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-navy">Status</legend>
          <div className="mt-2 flex gap-4">
            {(["draft", "published"] as const).map((value) => (
              <label
                key={value}
                className="inline-flex items-center gap-2 text-sm text-navy capitalize"
              >
                <input
                  type="radio"
                  name="status"
                  value={value}
                  checked={status === value}
                  onChange={() => setStatus(value)}
                />
                {value}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {status === "published"
              ? "Visible on the public Updates page."
              : "Only visible to you. Drafts never appear publicly."}
          </p>
        </fieldset>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-4">
        <SubmitButton />
        <Link
          href="/admin/updates"
          className="text-sm font-medium text-slate-600 hover:text-navy"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
