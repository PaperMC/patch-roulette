const EMPTY = "—";

const toRelative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** Formats a duration in milliseconds as "2h 34m". */
export function formatDuration(milliseconds: number | null | undefined): string {
    if (milliseconds === null || milliseconds === undefined) return EMPTY;

    let remaining = Math.max(0, Math.round(milliseconds / 1000));
    const days = Math.floor(remaining / 86_400);
    remaining %= 86_400;
    const hours = Math.floor(remaining / 3_600);
    remaining %= 3_600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(" ");
}

/** Formats a backend epoch-millisecond timestamp in local time. */
export function formatDateTime(milliseconds: number): string {
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) return String(milliseconds);
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/** Formats a backend epoch-millisecond timestamp as a relative time. */
export function relativeTime(milliseconds: number): string {
    const diffMs = milliseconds - Date.now();
    const abs = Math.abs(diffMs);
    const MIN = 60_000;
    const HOUR = 3_600_000;
    const DAY = 86_400_000;
    const MONTH = 2_592_000_000;
    const YEAR = 31_536_000_000;

    if (abs < MIN) return toRelative.format(Math.round(diffMs / 1000), "second");
    if (abs < HOUR) return toRelative.format(Math.round(diffMs / MIN), "minute");
    if (abs < DAY) return toRelative.format(Math.round(diffMs / HOUR), "hour");
    if (abs < MONTH) return toRelative.format(Math.round(diffMs / DAY), "day");
    if (abs < YEAR) return toRelative.format(Math.round(diffMs / MONTH), "month");
    return toRelative.format(Math.round(diffMs / YEAR), "year");
}
