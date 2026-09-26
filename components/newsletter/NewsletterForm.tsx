"use client";

import Link from "next/link";
import { useActionState, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  subscribeToNewsletter,
  type SubscribeState,
} from "@/lib/newsletter/actions";

function SubmitButton({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-sm bg-orange font-bold tracking-wide text-navy uppercase transition-colors hover:bg-flame disabled:cursor-not-allowed disabled:opacity-70 ${
        compact ? "px-6 py-3 text-sm" : "px-8 py-4 text-base"
      }`}
    >
      {pending ? "Sending…" : "Subscribe"}
    </button>
  );
}

export default function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction] = useActionState<SubscribeState, FormData>(
    subscribeToNewsletter,
    { status: "idle" },
  );

  const emailId = useId();
  const consentId = useId();
  const messageId = useId();

  // Used for the minimum fill-time check. Set once when the form mounts.
  const startedAt = useRef(Date.now());

  return (
    <form action={formAction} className={compact ? "" : "max-w-xl"}>
      {/* Honeypot. Hidden from sight and from assistive tech, and skipped in
          the tab order, so only a bot fills it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${emailId}-website`}>Leave this empty</label>
        <input
          id={`${emailId}-website`}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input type="hidden" name="startedAt" value={startedAt.current} />

      <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4"}>
        <div>
          <label
            htmlFor={emailId}
            className="block text-sm font-semibold text-cream"
          >
            Email address
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby={state.status !== "idle" ? messageId : undefined}
            aria-invalid={state.status === "error" || undefined}
            className="mt-1 w-full rounded-sm border border-navy-line bg-navy-soft px-4 py-3 text-base text-cream placeholder:text-cream/40 focus:border-orange focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex items-start gap-3">
          {/* Deliberately not defaultChecked: consent must be a positive act. */}
          <input
            id={consentId}
            name="consent"
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-orange"
          />
          <label htmlFor={consentId} className="text-sm leading-relaxed text-cream/80">
            Yes, email me occasional AHCD updates. I can unsubscribe at any
            time using the link in any email.
          </label>
        </div>

        <div>
          <SubmitButton compact={compact} />
        </div>
      </div>

      {state.status !== "idle" && (
        <p
          id={messageId}
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-4 border-l-4 px-4 py-3 text-sm leading-relaxed ${
            state.status === "error"
              ? "border-orange bg-navy-soft text-cream/90"
              : "border-flame bg-navy-soft text-cream/90"
          }`}
        >
          {state.message}
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-cream/55">
        We only ever store your email address, and only to send these updates.{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-4 hover:text-flame"
        >
          How we handle it
        </Link>
        .
      </p>
    </form>
  );
}
