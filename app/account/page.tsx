import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import { initialsFor, toNavUser } from "@/lib/auth-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your account — Ali's Heat Crunch Delight",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();

  // getUser() revalidates with the Supabase Auth server. getSession() would
  // only read the cookie, which is spoofable, so it is never used to gate access.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await searchParams;
  const account = toNavUser(user);

  return (
    <section className="bg-navy">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
          Your account
        </p>
        <h1 className="display-hed mt-3 text-[clamp(2.5rem,9vw,4.5rem)] text-cream">
          {account.displayName}
        </h1>

        {error === "signout" && (
          <p
            role="alert"
            className="mt-6 border-l-4 border-orange bg-navy-soft px-5 py-4 text-sm leading-relaxed text-cream/85 sm:text-base"
          >
            We couldn&rsquo;t sign you out just then, so you&rsquo;re still
            signed in. Please try again.
          </p>
        )}

        <div className="mt-10 border border-navy-line bg-navy-soft p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <Avatar
              avatarUrl={account.avatarUrl}
              displayName={account.displayName}
            />

            <div className="min-w-0">
              <p className="display-hed text-2xl text-cream sm:text-3xl">
                {account.displayName}
              </p>
              <p className="mt-1 truncate text-sm text-cream/70 sm:text-base">
                {account.email}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 border border-navy-line px-3 py-1 text-[0.7rem] font-bold tracking-[0.14em] text-flame uppercase">
                Signed in with Google
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-navy-line pt-6">
            <SignOutButton />
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <FutureCard title="Orders" body="No orders yet." />
          <FutureCard title="Saved details" body="Coming later." />
        </div>
      </div>
    </section>
  );
}

function Avatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={96}
        height={96}
        className="h-20 w-20 shrink-0 rounded-full border-2 border-cream/30 object-cover sm:h-24 sm:w-24"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="display-hed flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-cream/30 bg-navy text-2xl text-flame sm:h-24 sm:w-24 sm:text-3xl"
    >
      {initialsFor(displayName)}
    </div>
  );
}

function FutureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-navy-line p-6">
      <h2 className="display-hed text-xl text-flame sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-cream/65 sm:text-base">{body}</p>
    </div>
  );
}
