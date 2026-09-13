import { signOut } from "@/lib/auth-actions";

export default function SignOutButton({
  className = "",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={
          className ||
          "inline-flex items-center justify-center rounded-sm border border-cream/25 px-6 py-3 text-sm font-bold tracking-wide text-cream uppercase transition-colors hover:border-orange hover:text-orange"
        }
      >
        {label}
      </button>
    </form>
  );
}
