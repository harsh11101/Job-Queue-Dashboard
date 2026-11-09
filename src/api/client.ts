import { config } from "@/config"
import type { ErrorBody } from "./types"

/** Why a request failed, so screens can say something specific. */
export type ApiErrorKind = "http" | "network" | "timeout"

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string | null

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, code: string | null = null) {
    super(message)
    this.name = "ApiError"
    this.kind = kind
    this.status = status
    this.code = code
  }

  /** True when the backend could not be reached at all. */
  get unreachable(): boolean {
    return this.kind !== "http"
  }
}

/** A raw exchange, used by the API explorer, which shows non-2xx answers instead of throwing. */
export interface RawResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  durationMs: number
}

export interface RequestOptions {
  method?: "GET" | "POST"
  body?: unknown
  signal?: AbortSignal
  /** Raw body text sent as-is (explorer), instead of JSON-encoding `body`. */
  rawBody?: string
}

export function apiUrl(path: string): string {
  return `${config.apiBaseUrl}${path}`
}

/**
 * Sends a request with a hard timeout, combined with the caller's own abort signal
 * (React Query cancels superseded requests through it).
 */
export async function sendRaw(path: string, options: RequestOptions = {}): Promise<RawResponse> {
  const timeout = AbortSignal.timeout(config.requestTimeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  const body = options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body))
  const started = performance.now()
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body,
      signal,
    })
  } catch (error) {
    if (timeout.aborted) {
      throw new ApiError("timeout", `The backend did not answer within ${config.requestTimeoutMs / 1000} s.`)
    }
    if (options.signal?.aborted) {
      throw error
    }
    throw new ApiError("network", "The backend cannot be reached. Check that it is running and that CORS allows this origin.")
  }
  const text = await response.text()
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body: text,
    durationMs: Math.round(performance.now() - started),
  }
}

/** Sends a request and parses JSON, throwing {@link ApiError} for any non-2xx answer. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<{ status: number; data: T }> {
  const raw = await sendRaw(path, options)
  const parsed = parseJson(raw.body)
  if (raw.status < 200 || raw.status >= 300) {
    const errorBody = isErrorBody(parsed) ? parsed : null
    throw new ApiError(
      "http",
      errorBody?.message ?? `The backend answered ${raw.status} ${raw.statusText}`.trim(),
      raw.status,
      errorBody?.code ?? null,
    )
  }
  return { status: raw.status, data: parsed as T }
}

function parseJson(text: string): unknown {
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === "object" && value !== null && "code" in value && "message" in value
}
