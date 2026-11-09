/**
 * Runtime configuration, read once from Vite environment variables (see .env.example).
 * No other module reads import.meta.env or hardcodes a backend address.
 */

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

/** Backend origin without a trailing slash; empty means "same origin as the dashboard". */
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "")

export const config = {
  apiBaseUrl,
  /** How often live views refresh while the tab is visible. */
  pollIntervalMs: positiveInt(import.meta.env.VITE_POLL_INTERVAL_MS, 5000),
  /** Every request is aborted after this long. */
  requestTimeoutMs: positiveInt(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 10000),
} as const

/** Human-readable backend location for messages and the API explorer. */
export const apiDisplayOrigin = apiBaseUrl || window.location.origin
