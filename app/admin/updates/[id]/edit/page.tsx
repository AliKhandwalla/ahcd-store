import Link from "next/link";
import { notFound } from "next/navigation";
import UpdateForm from "@/components/admin/UpdateForm";
import { saveUpdate } from "@/lib/updates/actions";
import { getUpdateForEdit } from "@/lib/updates/queries";

export default async function EditUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getUpdateForEdit(id);

  if (!record) notFound();

  const { update, images } = record;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-navy">Edit update</h1>
        {update.status === "published" && (
          <Link
            href={`/updates/${update.slug}`}
            className="text-sm font-medium text-blue hover:underline"
          >
            View public page
          </Link>
        )}
      </div>

      <div className="mt-6">
        <UpdateForm
          action={saveUpdate}
          initial={{
            id: update.id,
            title: update.title,
            slug: update.slug,
            description: update.description,
            status: update.status,
            images,
          }}
        />
      </div>
    </div>
  );
}
