import {
  VISIBILITY_LABELS,
  type ProductVisibility,
} from "@/lib/products/types";

const TONE: Record<ProductVisibility, string> = {
  published: "border-emerald-300 bg-emerald-50 text-emerald-700",
  hidden: "border-amber-300 bg-amber-50 text-amber-700",
  archived: "border-slate-300 bg-slate-100 text-slate-600",
};

export default function VisibilityPill({
  visibility,
}: {
  visibility: ProductVisibility;
}) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium ${TONE[visibility]}`}
    >
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}
