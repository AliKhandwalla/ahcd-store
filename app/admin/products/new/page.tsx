import ProductForm from "@/components/admin/ProductForm";
import { createProduct } from "@/lib/products/actions";
import { adminPageAllowed } from "@/lib/admin/auth";

export default async function NewProductPage() {
  // The layout cannot protect this page: layouts and pages render in
  // parallel, so its redirect does not stop this component running.
  if (!(await adminPageAllowed())) return null;

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
