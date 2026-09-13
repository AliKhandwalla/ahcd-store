import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in — Ali's Heat Crunch Delight",
  description:
    "Sign in to Ali's Heat Crunch Delight to manage your account and future orders.",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  return (
    <AuthShell showCrest eyebrow="Account" heading="Welcome to AHCD">
      <p className="mt-6 max-w-md text-base leading-relaxed text-cream/80 sm:text-lg">
        Sign in to manage your account and future orders. You don&rsquo;t need an
        account to browse &mdash; the shop stays open to everyone.
      </p>

      <div className="mt-8">
        <GoogleSignInButton />
      </div>

      <p className="mt-8 text-sm text-cream/55">
        We only use Google sign-in, so there&rsquo;s no AHCD password to create
        or remember.
      </p>
    </AuthShell>
  );
}
