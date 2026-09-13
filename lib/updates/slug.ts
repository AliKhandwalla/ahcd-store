/**
 * URL-safe slug from a title. Strips accents, keeps a–z 0–9, collapses runs of
 * separators, and trims to a sane length.
 */
export function slugify(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop combining accents
    .toLowerCase()
    .replace(/['’]/g, "") // don't turn "Ali's" into "ali-s"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  // A title of only punctuation or non-Latin script would slugify to nothing.
  return base || "update";
}

/**
 * Candidate slugs in the order they should be attempted: the base, then
 * base-2, base-3 … Collisions are resolved by retrying the insert rather than
 * by pre-checking, so two concurrent creates cannot both claim the same slug.
 */
export function slugCandidates(title: string, attempts = 8) {
  const base = slugify(title);
  return Array.from({ length: attempts }, (_, i) =>
    i === 0 ? base : `${base}-${i + 1}`,
  );
}
