const dateTime = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
const integer = new Intl.NumberFormat()
const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 })

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : "—"
}

/** "3 min ago", "in 25 s". */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) {
    return "—"
  }
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) {
    return relative.format(seconds, "second")
  }
  if (abs < 3600) {
    return relative.format(Math.round(seconds / 60), "minute")
  }
  if (abs < 86_400) {
    return relative.format(Math.round(seconds / 3600), "hour")
  }
  return relative.format(Math.round(seconds / 86_400), "day")
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return "—"
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
  }
  return `${(ms / 60_000).toFixed(1)} min`
}

export function durationBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) {
    return null
  }
  return new Date(end).getTime() - new Date(start).getTime()
}

export function formatCount(value: number): string {
  return integer.format(value)
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? "—" : percent.format(ratio)
}

/** Pretty-prints a serialized JSON string; returns the input unchanged when it is not JSON. */
export function prettyJson(text: string | null | undefined): string {
  if (!text) {
    return ""
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

/** First 8 characters of a UUID, for dense tables (the full id is always one click away). */
export function shortId(id: string): string {
  return id.slice(0, 8)
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
