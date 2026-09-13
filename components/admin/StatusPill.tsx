export default function StatusPill({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium ${
        published
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-amber-300 bg-amber-50 text-amber-700"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
