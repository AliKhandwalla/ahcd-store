"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { pruneExpiredPending, type PruneState } from "@/lib/newsletter/admin";

function Submit({ expired }: { expired: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || expired === 0}
      className="inline-flex items-center border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy transition-colors hover:border-navy disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Removing…"
        : expired === 0
          ? "Nothing to remove"
          : `Remove ${expired} expired`}
    </button>
  );
}

export default function PruneExpiredPending({ expired }: { expired: number }) {
  const [state, formAction] = useActionState<PruneState, FormData>(
    () => pruneExpiredPending(),
    { status: "idle" },
  );

  return (
    <div>
      <form action={formAction}>
        <Submit expired={expired} />
      </form>

      {state.status !== "idle" && (
        <p
          role="status"
          className={`mt-2 text-sm ${
            state.status === "error" ? "text-orange-deep" : "text-slate-600"
          }`}
        >
          {state.message}
        </p>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Only removes confirmations that have already expired. People still
        waiting to confirm are never touched.
      </p>
    </div>
  );
}
