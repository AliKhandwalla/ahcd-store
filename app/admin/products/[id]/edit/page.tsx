import Link from "next/link";
import { notFound } from "next/navigation";
import ProductForm, {
  type ProductEditorImage,
} from "@/components/admin/ProductForm";
import { saveProduct } from "@/lib/products/actions";
import { getProductForEdit } from "@/lib/products/admin-queries";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductForEdit(id);

  if (!product) notFound();

  const images: ProductEditorImage[] = product.images.map((image) => ({
    source: image.source,
    storagePath: image.path,
    altText: image.alt_text ?? "",
    width: image.width,
    height: image.height,
    previewUrl: image.previewUrl,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-navy">Edit product</h1>
        <Link
          href={
            product.visibility === "published"
              ? `/products/${product.slug}`
              : `/products/${product.slug}?preview=1`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue hover:underline"
        >
          {product.visibility === "published"
            ? "View public page"
            : "Preview (not public)"}
        </Link>
      </div>

      <div className="mt-6">
        <ProductForm
          action={saveProduct}
          initial={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            summary: product.summary,
            description: product.description,
            about: product.about,
            price: (product.price_cents / 100).toFixed(2),
            visibility: product.visibility,
            sortOrder: product.sort_order,
            mediaPadding: product.media_padding,
            details: Array.isArray(product.details) ? product.details : [],
            images,
          }}
        />
      </div>
    </div>
  );
}
