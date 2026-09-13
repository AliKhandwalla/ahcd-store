"use client";

import { useEffect, useState } from "react";
import { deleteUpdate } from "@/lib/updates/actions";

/**
 * Two-step delete. A single click only opens the confirmation, so an accidental
 * click can never destroy an update.
 */
export default function DeleteUpdateButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-orange-deep hover:underline"
      >
        Delete
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-title-${id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
        >
          <div className="w-full max-w-sm border border-slate-300 bg-white p-5">
            <h2
              id={`delete-title-${id}`}
              className="text-base font-semibold text-navy"
            >
              Delete &ldquo;{title}&rdquo;?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This cannot be undone. Its images will be removed too.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-slate-300 px-4 py-2 text-sm font-medium text-navy hover:border-navy"
              >
                Cancel
              </button>
              <form action={deleteUpdate}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  className="border border-orange-deep bg-orange-deep px-4 py-2 text-sm font-semibold text-white hover:bg-orange"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
