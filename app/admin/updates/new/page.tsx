import UpdateForm from "@/components/admin/UpdateForm";
import { createUpdate } from "@/lib/updates/actions";

export default function NewUpdatePage() {
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
