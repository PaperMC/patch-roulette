import { DateTime, Duration } from "luxon";

const EMPTY = "—";

/** Formats an ISO 8601 duration (e.g. "PT2H34M") as "2h 34m". */
export function formatDuration(iso: string | null | undefined): string {
    if (!iso) return EMPTY;
    const duration = Duration.fromISO(iso);
    if (!duration.isValid) return iso;

    const shifted = duration.shiftTo("days", "hours", "minutes", "seconds");
    const parts: string[] = [];
    if (shifted.days > 0) parts.push(`${shifted.days}d`);
    if (shifted.hours > 0) parts.push(`${shifted.hours}h`);
    if (shifted.minutes > 0) parts.push(`${shifted.minutes}m`);
    if (shifted.seconds > 0 || parts.length === 0) parts.push(`${Math.round(shifted.seconds)}s`);
    return parts.join(" ");
}

/** Formats a backend UTC ISO datetime in local time. */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return EMPTY;
    const dateTime = DateTime.fromISO(iso, { zone: "utc" });
    if (!dateTime.isValid) return iso;
    return dateTime.toLocal().toLocaleString(DateTime.DATETIME_MED);
}

/** Formats a backend UTC ISO datetime as a relative time. */
export function relativeTime(iso: string | null | undefined): string {
    if (!iso) return EMPTY;
    const dateTime = DateTime.fromISO(iso, { zone: "utc" });
    if (!dateTime.isValid) return iso;
    return dateTime.toLocal().toRelative() ?? iso;
}
