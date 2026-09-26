import Link from "next/link";
import { notFound } from "next/navigation";
import UpdateForm from "@/components/admin/UpdateForm";
import { saveUpdate } from "@/lib/updates/actions";
import { getUpdateForEdit } from "@/lib/updates/queries";
import { utcToZonedLocalInput } from "@/lib/updates/time";

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
            category: update.category,
            // Stored UTC is converted back to Houston wall-clock for the
            // datetime-local inputs, so what Ali typed is what he sees.
            eventStartAt: utcToZonedLocalInput(update.event_start_at),
            eventEndAt: utcToZonedLocalInput(update.event_end_at),
            venueName: update.venue_name ?? "",
            venueAddress: update.venue_address ?? "",
            isFeatured: update.is_featured,
            images,
          }}
        />
      </div>
    </div>
  );
}
