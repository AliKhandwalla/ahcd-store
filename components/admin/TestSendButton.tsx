"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  sendTestNewsletter,
  type TestSendState,
} from "@/lib/newsletter/test-send";

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center border border-navy bg-navy px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send test to myself"}
    </button>
  );
}

/**
 * Sends the previewed newsletter to the signed-in administrator.
 *
 * The recipient is never submitted from here — the server reads it from the
 * verified admin session, so this form cannot be used to mail anyone else.
 */
export default function TestSendButton({
  updateId,
  disabled = false,
  disabledReason,
}: {
  updateId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction] = useActionState<TestSendState, FormData>(
    sendTestNewsletter,
    { status: "idle" },
  );

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="updateId" value={updateId} />
        <Submit disabled={disabled} />
      </form>

      {disabled && disabledReason && (
        <p className="mt-2 text-xs text-slate-500">{disabledReason}</p>
      )}

      {state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-3 border-l-4 px-3 py-2 text-sm ${
            state.status === "error"
              ? "border-orange-deep bg-orange/5 text-orange-deep"
              : "border-emerald-400 bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.message}
        </p>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Goes only to your own admin address, never to subscribers.
      </p>
    </div>
  );
}
