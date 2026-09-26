"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import ImageUploader, { type EditorImage } from "@/components/admin/ImageUploader";
import type { ActionResult } from "@/lib/updates/actions";
import { EVENT_TIME_ZONE } from "@/lib/updates/time";
import {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY,
  UPDATE_CATEGORIES,
  type UpdateCategory,
  type UpdateStatus,
} from "@/lib/updates/types";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  initial?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    status: UpdateStatus;
    category: UpdateCategory;
    eventStartAt: string;
    eventEndAt: string;
    venueName: string;
    venueAddress: string;
    isFeatured: boolean;
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
  const [category, setCategory] = useState<UpdateCategory>(
    initial?.category ?? DEFAULT_CATEGORY,
  );

  // Event fields only apply to market events. The server also nulls them for
  // other categories, so switching away can't leave stale data behind.
  const isMarketEvent = category === "market-event";

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

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-navy">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as UpdateCategory)
            }
            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none sm:w-64"
          >
            {UPDATE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {isMarketEvent && (
          <fieldset className="border border-slate-200 bg-white p-4">
            <legend className="px-1 text-sm font-medium text-navy">
              Event details
            </legend>
            <p className="text-xs text-slate-500">
              All optional. Times are {EVENT_TIME_ZONE.replace("America/", "")}{" "}
              local (Houston).
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="eventStartAt"
                  className="block text-xs font-medium text-slate-600"
                >
                  Starts
                </label>
                <input
                  id="eventStartAt"
                  name="eventStartAt"
                  type="datetime-local"
                  defaultValue={initial?.eventStartAt}
                  className="mt-1 w-full border border-slate-300 px-2 py-1.5 text-sm text-navy focus:border-navy focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="eventEndAt"
                  className="block text-xs font-medium text-slate-600"
                >
                  Ends
                </label>
                <input
                  id="eventEndAt"
                  name="eventEndAt"
                  type="datetime-local"
                  defaultValue={initial?.eventEndAt}
                  className="mt-1 w-full border border-slate-300 px-2 py-1.5 text-sm text-navy focus:border-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label
                htmlFor="venueName"
                className="block text-xs font-medium text-slate-600"
              >
                Venue name
              </label>
              <input
                id="venueName"
                name="venueName"
                type="text"
                maxLength={200}
                defaultValue={initial?.venueName}
                placeholder="Evelyn's Park"
                className="mt-1 w-full border border-slate-300 px-2 py-1.5 text-sm text-navy focus:border-navy focus:outline-none"
              />
            </div>

            <div className="mt-3">
              <label
                htmlFor="venueAddress"
                className="block text-xs font-medium text-slate-600"
              >
                Venue address
              </label>
              <textarea
                id="venueAddress"
                name="venueAddress"
                rows={2}
                maxLength={300}
                defaultValue={initial?.venueAddress}
                placeholder="4400 Bellaire Blvd, Bellaire, TX"
                className="mt-1 w-full border border-slate-300 px-2 py-1.5 text-sm text-navy focus:border-navy focus:outline-none"
              />
            </div>
          </fieldset>
        )}

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

        <div className="border-t border-slate-200 pt-4">
          <label className="inline-flex items-start gap-2 text-sm text-navy">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={initial?.isFeatured}
              disabled={status !== "published"}
              className="mt-0.5"
            />
            <span>
              Feature this update
              <span className="mt-0.5 block text-xs text-slate-500">
                {status === "published"
                  ? "Shows prominently on Updates and first on the homepage. Only one update can be featured — this replaces any current one. A market event stops being promoted once it's over, but stays in the archive."
                  : "Only a published update can be featured."}
              </span>
            </span>
          </label>
        </div>
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
