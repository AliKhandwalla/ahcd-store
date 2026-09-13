import type { User } from "@supabase/supabase-js";

/**
 * The only shape of user data that crosses the server/client boundary.
 *
 * The full Supabase `User` carries identity records, app metadata, provider
 * tokens and confirmation timestamps. None of that is needed to draw a navbar,
 * so none of it is serialized into the RSC payload — the client sees exactly
 * the three fields it renders and nothing more.
 */
export type NavUser = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

function readString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function toNavUser(user: User): NavUser {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? "";

  const displayName =
    readString(metadata, "full_name") ??
    readString(metadata, "name") ??
    (email ? email.split("@")[0] : "Account");

  return {
    displayName,
    email,
    avatarUrl:
      readString(metadata, "avatar_url") ?? readString(metadata, "picture"),
  };
}

/** Up to two initials for the avatar fallback when Google gives us no picture. */
export function initialsFor(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
