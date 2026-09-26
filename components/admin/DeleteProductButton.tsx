"use client";

import { useEffect, useState } from "react";
import { deleteProduct } from "@/lib/products/actions";

/**
 * Two-step delete, matching the Updates pattern: a single click only opens the
 * confirmation. Hiding or archiving is the non-destructive alternative and is
 * offered here explicitly, since deleting is rarely what's actually wanted.
 */
export default function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
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
          aria-labelledby={`delete-product-${id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
        >
          <div className="w-full max-w-sm border border-slate-300 bg-white p-5">
            <h2
              id={`delete-product-${id}`}
              className="text-base font-semibold text-navy"
            >
              Delete &ldquo;{name}&rdquo;?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This cannot be undone. Any photos you uploaded for it are removed
              too.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              To take it off the website without losing it, set its visibility
              to <strong>Hidden</strong> or <strong>Archived</strong> instead.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-slate-300 px-4 py-2 text-sm font-medium text-navy hover:border-navy"
              >
                Cancel
              </button>
              <form action={deleteProduct}>
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
