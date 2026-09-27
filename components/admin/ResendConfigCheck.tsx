"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { verifyResendConfiguration, type CheckResult } from "@/lib/newsletter/verify";

type State = { results: CheckResult[] | null };

async function run(): Promise<State> {
  return { results: await verifyResendConfiguration() };
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy transition-colors hover:border-navy disabled:opacity-60"
    >
      {pending ? "Checking…" : "Check configuration"}
    </button>
  );
}

/**
 * Runs the Resend configuration check on demand.
 *
 * Nothing here executes automatically — the live API calls happen only when
 * the administrator clicks, so no request, build or deploy pays for them.
 */
export default function ResendConfigCheck() {
  const [state, formAction] = useActionState<State, FormData>(run, {
    results: null,
  });

  return (
    <div>
      <form action={formAction}>
        <Submit />
      </form>

      {state.results && (
        <ul className="mt-3 space-y-1.5">
          {state.results.map((r) => (
            <li
              key={r.label}
              className={`border-l-4 px-3 py-2 text-sm ${
                r.ok
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                  : "border-orange-deep bg-orange/5 text-orange-deep"
              }`}
            >
              <span className="font-semibold">
                {r.ok ? "OK" : "Problem"} — {r.label}
              </span>
              <span className="mt-0.5 block text-xs opacity-90">{r.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Makes live Resend calls only when you click. Never runs on page load,
        build or deploy.
      </p>
    </div>
  );
}
