import Image from "next/image";
import Link from "next/link";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import VisibilityPill from "@/components/admin/VisibilityPill";
import { reorderProduct } from "@/lib/products/actions";
import { listAllProducts } from "@/lib/products/admin-queries";
import {
  PRODUCT_VISIBILITIES,
  VISIBILITY_LABELS,
  isProductVisibility,
} from "@/lib/products/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ visibility?: string }>;
}) {
  const { visibility } = await searchParams;
  const active = isProductVisibility(visibility) ? visibility : null;

  const all = await listAllProducts();
  const rows = active ? all.filter((p) => p.visibility === active) : all;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-navy">Products</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center border border-navy bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-soft"
        >
          New product
        </Link>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Filter by visibility"
      >
        <Link
          href="/admin/products"
          aria-current={!active ? "page" : undefined}
          className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
            !active
              ? "border-navy bg-navy text-white"
              : "border-slate-300 bg-white text-navy hover:border-navy"
          }`}
        >
          All
        </Link>
        {PRODUCT_VISIBILITIES.map((key) => (
          <Link
            key={key}
            href={`/admin/products?visibility=${key}`}
            aria-current={key === active ? "page" : undefined}
            className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
              key === active
                ? "border-navy bg-navy text-white"
                : "border-slate-300 bg-white text-navy hover:border-navy"
            }`}
          >
            {VISIBILITY_LABELS[key]}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-slate-600">Product</th>
              <th className="px-4 py-2 font-medium text-slate-600">Price</th>
              <th className="px-4 py-2 font-medium text-slate-600">
                Visibility
              </th>
              <th className="px-4 py-2 font-medium text-slate-600">Images</th>
              <th className="px-4 py-2 font-medium text-slate-600">Order</th>
              <th className="px-4 py-2 font-medium text-slate-600">Updated</th>
              <th className="px-4 py-2 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {all.length === 0 ? (
                    <>
                      No products yet.{" "}
                      <Link
                        href="/admin/products/new"
                        className="text-blue hover:underline"
                      >
                        Add the first one
                      </Link>
                      .
                    </>
                  ) : (
                    `No ${active ? VISIBILITY_LABELS[active].toLowerCase() : ""} products.`
                  )}
                </td>
              </tr>
            ) : (
              rows.map((product, index) => (
                <tr
                  key={product.id}
                  className="border-b border-slate-100 align-middle last:border-0"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-slate-200 bg-white">
                        {product.thumbnailUrl && (
                          <Image
                            src={product.thumbnailUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-contain p-0.5"
                            unoptimized
                          />
                        )}
                      </div>
                      <span className="font-medium text-navy">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600 tabular-nums">
                    {money(product.price_cents)}
                  </td>
                  <td className="px-4 py-2">
                    <VisibilityPill visibility={product.visibility} />
                  </td>
                  <td className="px-4 py-2 text-slate-600 tabular-nums">
                    {product.imageCount}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <form action={reorderProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          aria-label={`Move ${product.name} earlier`}
                          className="border border-slate-300 px-2 py-0.5 text-sm text-navy disabled:opacity-40"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={reorderProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === rows.length - 1}
                          aria-label={`Move ${product.name} later`}
                          className="border border-slate-300 px-2 py-0.5 text-sm text-navy disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600 tabular-nums">
                    {formatDate(product.updated_at)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-sm font-medium text-blue hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={
                          product.visibility === "published"
                            ? `/products/${product.slug}`
                            : `/products/${product.slug}?preview=1`
                        }
                        className="text-sm font-medium text-blue hover:underline"
                      >
                        {product.visibility === "published" ? "View" : "Preview"}
                      </Link>
                      <DeleteProductButton
                        id={product.id}
                        name={product.name}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Prices are managed here for now. When Square is connected it becomes the
        source of truth for pricing, while this dashboard keeps owning names,
        copy, photos and ordering.
      </p>
    </div>
  );
}
