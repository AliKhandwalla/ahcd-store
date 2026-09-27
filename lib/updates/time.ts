/**
 * Event date/time handling for AHCD market events.
 *
 * Events are stored as `timestamptz` (UTC) and always presented in Houston
 * local time. Everything here is built on Intl.DateTimeFormat, so there is no
 * date library dependency.
 */

export const EVENT_TIME_ZONE = "America/Chicago";

/**
 * How far `timeZone` is ahead of UTC at the given instant, in milliseconds.
 *
 * Works by formatting the instant in that zone, reading the wall-clock parts
 * back, and comparing them to the true UTC value.
 */
function zoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  // "24" appears at midnight in some ICU versions; normalise it to 0.
  const hour = read("hour") % 24;

  const asIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    hour,
    read("minute"),
    read("second"),
  );

  return asIfUtc - date.getTime();
}

/**
 * Converts a `<input type="datetime-local">` value, typed as Houston wall-clock
 * time, into a UTC ISO string for storage.
 *
 * The offset is resolved at the event's own instant and then re-checked, so a
 * date on either side of a daylight-saving switch converts correctly instead of
 * drifting an hour. Returns null for empty or unparseable input.
 */
export function zonedLocalToUtcISO(
  local: string,
  timeZone: string = EVENT_TIME_ZONE,
): string | null {
  if (!local) return null;

  // Check the shape before parsing. new Date() falls back to a lenient parser
  // that turns "not-a-date:00Z" into 1 Jan 2000 rather than NaN, so relying on
  // NaN alone would silently store a real-looking but wrong event date.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;

  // Treat the wall-clock string as if it were UTC to get a first approximation.
  const naive = new Date(`${local}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const firstGuess = new Date(naive.getTime() - zoneOffsetMs(naive, timeZone));

  // Re-resolve using the candidate instant: near a DST boundary the offset that
  // applies to the result differs from the one at the approximation.
  const corrected = new Date(
    naive.getTime() - zoneOffsetMs(firstGuess, timeZone),
  );

  return corrected.toISOString();
}

/** UTC ISO -> the "YYYY-MM-DDTHH:mm" value a datetime-local input expects. */
export function utcToZonedLocalInput(
  iso: string | null,
  timeZone: string = EVENT_TIME_ZONE,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const shifted = new Date(date.getTime() + zoneOffsetMs(date, timeZone));
  return shifted.toISOString().slice(0, 16);
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: EVENT_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: EVENT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

function sameZonedDay(a: Date, b: Date) {
  const key = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: EVENT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  return key(a) === key(b);
}

/**
 * Human-readable event time in Houston, e.g.
 *   "Sunday, September 27, 2026 · 12:00 PM – 4:00 PM CDT"
 * Falls back gracefully when there is no end time, or when the event spans days.
 */
export function formatEventRange(
  startIso: string | null,
  endIso: string | null,
) {
  if (!startIso) return "";

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";

  const day = new Intl.DateTimeFormat("en-US", DATE_FORMAT).format(start);
  const startTime = new Intl.DateTimeFormat("en-US", TIME_FORMAT).format(start);

  if (!endIso) return `${day} · ${startTime}`;

  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return `${day} · ${startTime}`;

  if (sameZonedDay(start, end)) {
    // Drop the zone label from the start so it isn't printed twice.
    const startNoZone = new Intl.DateTimeFormat("en-US", {
      ...TIME_FORMAT,
      timeZoneName: undefined,
    }).format(start);
    const endTime = new Intl.DateTimeFormat("en-US", TIME_FORMAT).format(end);
    return `${day} · ${startNoZone} – ${endTime}`;
  }

  const endDay = new Intl.DateTimeFormat("en-US", DATE_FORMAT).format(end);
  const endTime = new Intl.DateTimeFormat("en-US", TIME_FORMAT).format(end);
  return `${day} · ${startTime} – ${endDay} · ${endTime}`;
}

/**
 * True once the event is over: the end time if there is one, otherwise the
 * start. Used to stop promoting past events — never to hide or unpublish them.
 */
export function isEventExpired(
  startIso: string | null,
  endIso: string | null,
  now: Date = new Date(),
) {
  const reference = endIso ?? startIso;
  if (!reference) return false;

  const date = new Date(reference);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < now.getTime();
}
