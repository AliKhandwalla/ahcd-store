import { formatEventRange, isEventExpired } from "@/lib/updates/time";
import type { UpdateRow } from "@/lib/updates/types";

/**
 * Structured market-event information, shown consistently on every event
 * article. Renders nothing when an event has no details filled in yet.
 */
export default function EventDetails({ update }: { update: UpdateRow }) {
  const { event_start_at, event_end_at, venue_name, venue_address } = update;

  const hasAnything =
    event_start_at || event_end_at || venue_name || venue_address;
  if (!hasAnything) return null;

  const when = formatEventRange(event_start_at, event_end_at);
  const past = isEventExpired(event_start_at, event_end_at);

  return (
    <aside
      aria-label="Event details"
      className="mt-8 border border-navy-line bg-navy-soft p-5 sm:p-6"
    >
      <h2 className="text-xs font-bold tracking-[0.22em] text-orange uppercase sm:text-sm">
        {past ? "Event details" : "Where to find us"}
      </h2>

      <dl className="mt-4 space-y-3 text-sm sm:text-base">
        {when && (
          <div>
            <dt className="text-xs font-bold tracking-[0.16em] text-cream/50 uppercase">
              When
            </dt>
            <dd className="mt-1 text-cream/90">
              {event_start_at ? (
                <time dateTime={event_start_at}>{when}</time>
              ) : (
                when
              )}
            </dd>
          </div>
        )}

        {venue_name && (
          <div>
            <dt className="text-xs font-bold tracking-[0.16em] text-cream/50 uppercase">
              Where
            </dt>
            <dd className="mt-1 text-cream/90">{venue_name}</dd>
          </div>
        )}

        {venue_address && (
          <div>
            <dt className="text-xs font-bold tracking-[0.16em] text-cream/50 uppercase">
              Address
            </dt>
            <dd className="mt-1 whitespace-pre-line text-cream/80">
              {venue_address}
            </dd>
          </div>
        )}
      </dl>

      {past && (
        <p className="mt-4 border-t border-navy-line pt-3 text-xs text-cream/50 sm:text-sm">
          This event has already taken place.
        </p>
      )}
    </aside>
  );
}
