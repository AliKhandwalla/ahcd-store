import ProductForm from "@/components/admin/ProductForm";
import { createProduct } from "@/lib/products/actions";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-navy">New product</h1>
      <p className="mt-1 text-sm text-slate-500">
        The website handles layout and image framing. Enter the content and a
        price.
      </p>
      <div className="mt-6">
        <ProductForm action={createProduct} />
      </div>
    </div>
  );
}
