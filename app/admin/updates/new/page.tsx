import UpdateForm from "@/components/admin/UpdateForm";
import { createUpdate } from "@/lib/updates/actions";
import { adminPageAllowed } from "@/lib/admin/auth";

export default async function NewUpdatePage() {
  // The layout cannot protect this page: layouts and pages render in
  // parallel, so its redirect does not stop this component running.
  if (!(await adminPageAllowed())) return null;

  return (
    <div>
      <h1 className="text-lg font-bold text-navy">New update</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the content. The site handles typography, spacing and image layout.
      </p>
      <div className="mt-6">
        <UpdateForm action={createUpdate} />
      </div>
    </div>
  );
}
