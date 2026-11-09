/** Every endpoint the backend serves for the dashboard, described from its controllers. */

export interface EndpointParam {
  name: string
  in: "path" | "query"
  required: boolean
  description: string
  example: string
}

export interface Endpoint {
  id: string
  method: "GET" | "POST"
  path: string
  summary: string
  description: string
  params: EndpointParam[]
  body?: string
  responses: { status: number; meaning: string }[]
  example: string
}

const job = {
  id: "3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f",
  idempotencyKey: "transfer-2026-0001",
  type: "BANK_TRANSFER_SETTLEMENT",
  priority: "HIGH",
  status: "SUCCEEDED",
  attempt: 1,
  maxAttempts: 4,
  nextRetryAt: null,
  payloadJson: '{"amount":"1250.00","currency":"PLN"}',
  resultJson: '{"effectCreated":true,"effectKey":"BANK_TRANSFER_SETTLEMENT:transfer-2026-0001"}',
  errorMessage: null,
  failureClass: null,
  traceId: "9d8b7c6a-1234-4f00-8abc-0123456789ab",
  createdAt: "2026-11-09T08:30:00.000Z",
  updatedAt: "2026-11-09T08:30:01.250Z",
  completedAt: "2026-11-09T08:30:01.250Z",
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2)

export const ENDPOINTS: Endpoint[] = [
  {
    id: "create",
    method: "POST",
    path: "/api/v1/jobs",
    summary: "Create a job",
    description:
      "Stores the job and its first outbox event in one transaction. Repeating the same idempotency key with the same request returns the existing job.",
    params: [],
    body: pretty({
      idempotencyKey: "transfer-2026-0001",
      type: "BANK_TRANSFER_SETTLEMENT",
      priority: "HIGH",
      payload: { amount: "1250.00", currency: "PLN" },
      maxAttempts: 4,
    }),
    responses: [
      { status: 201, meaning: "Created; the Location header points at the job" },
      { status: 200, meaning: "Same key and request seen before; existing job returned" },
      { status: 400, meaning: "Body missing a field or invalid (maxAttempts 1 to 20)" },
      { status: 409, meaning: "Key already used with a different type, priority or payload" },
    ],
    example: pretty({ ...job, status: "QUEUED", attempt: 0, resultJson: null, completedAt: null }),
  },
  {
    id: "list",
    method: "GET",
    path: "/api/v1/jobs",
    summary: "List jobs",
    description: "Pages through jobs newest first, optionally filtered by status, priority, type and creation time.",
    params: [
      { name: "status", in: "query", required: false, description: "QUEUED, PROCESSING, RETRY_SCHEDULED, SUCCEEDED, DLQ or CANCELLED", example: "" },
      { name: "priority", in: "query", required: false, description: "HIGH or LOW", example: "" },
      { name: "type", in: "query", required: false, description: "Job type, case-insensitive", example: "" },
      { name: "createdFrom", in: "query", required: false, description: "Inclusive ISO-8601 instant", example: "" },
      { name: "createdTo", in: "query", required: false, description: "Exclusive ISO-8601 instant", example: "" },
      { name: "page", in: "query", required: false, description: "Zero-based page, default 0", example: "0" },
      { name: "size", in: "query", required: false, description: "1 to 100, default 20", example: "5" },
    ],
    responses: [
      { status: 200, meaning: "One page" },
      { status: 400, meaning: "Unknown status or priority, size out of range, or a bad timestamp" },
    ],
    example: pretty({ items: [job], page: 0, size: 5, totalElements: 1, totalPages: 1 }),
  },
  {
    id: "get",
    method: "GET",
    path: "/api/v1/jobs/{id}",
    summary: "Get a job",
    description: "Returns the job's durable state, payload, result and last failure.",
    params: [{ name: "id", in: "path", required: true, description: "Job ID (UUID)", example: "" }],
    responses: [
      { status: 200, meaning: "The job" },
      { status: 400, meaning: "The ID is not a UUID" },
      { status: 404, meaning: "No job with this ID" },
    ],
    example: pretty(job),
  },
  {
    id: "attempts",
    method: "GET",
    path: "/api/v1/jobs/{id}/attempts",
    summary: "Get a job's attempts",
    description: "Lists every processing attempt from the audit table, oldest first.",
    params: [{ name: "id", in: "path", required: true, description: "Job ID (UUID)", example: "" }],
    responses: [
      { status: 200, meaning: "Attempts, possibly empty" },
      { status: 404, meaning: "No job with this ID" },
    ],
    example: pretty([
      {
        attempt: 1,
        status: "SUCCEEDED",
        topic: "jobs-high",
        errorMessage: null,
        failureClass: null,
        startedAt: "2026-11-09T08:30:01.020Z",
        finishedAt: "2026-11-09T08:30:01.250Z",
      },
    ]),
  },
  {
    id: "by-key",
    method: "GET",
    path: "/api/v1/jobs/idempotency/{key}",
    summary: "Find a job by idempotency key",
    description: "Looks up the job created with the given idempotency key.",
    params: [{ name: "key", in: "path", required: true, description: "Idempotency key", example: "transfer-2026-0001" }],
    responses: [
      { status: 200, meaning: "The job" },
      { status: 404, meaning: "No job has this key" },
    ],
    example: pretty(job),
  },
  {
    id: "replay",
    method: "POST",
    path: "/api/v1/jobs/{id}/replay",
    summary: "Replay a dead-letter job",
    description: "Moves a DLQ job back to QUEUED and publishes it again on the chosen lane as its next attempt.",
    params: [{ name: "id", in: "path", required: true, description: "ID of a job in DLQ", example: "" }],
    body: pretty({ priority: "HIGH" }),
    responses: [
      { status: 200, meaning: "Requeued job" },
      { status: 404, meaning: "No job with this ID" },
      { status: 409, meaning: "The job is not in DLQ" },
    ],
    example: pretty({ ...job, status: "QUEUED", attempt: 3, errorMessage: "Payload requested retryable failure simulation" }),
  },
  {
    id: "cancel",
    method: "POST",
    path: "/api/v1/jobs/{id}/cancel",
    summary: "Cancel a job",
    description:
      "Cancels a QUEUED, RETRY_SCHEDULED or DLQ job. A cancelled job never runs again and cannot be replayed. Repeating the call returns the cancelled job.",
    params: [{ name: "id", in: "path", required: true, description: "ID of a QUEUED, RETRY_SCHEDULED or DLQ job", example: "" }],
    responses: [
      { status: 200, meaning: "Cancelled job (also when it was already cancelled)" },
      { status: 404, meaning: "No job with this ID" },
      { status: 409, meaning: "The job is PROCESSING or SUCCEEDED" },
    ],
    example: pretty({ ...job, status: "CANCELLED" }),
  },
  {
    id: "stats",
    method: "GET",
    path: "/api/v1/jobs/stats",
    summary: "Get job counts",
    description: "Counts jobs by status and by priority, plus the mean duration of successful attempts.",
    params: [],
    responses: [{ status: 200, meaning: "Counters" }],
    example: pretty({
      countsByStatus: { DLQ: 2, QUEUED: 3, SUCCEEDED: 41 },
      countsByPriority: { HIGH: { SUCCEEDED: 30 }, LOW: { DLQ: 2, QUEUED: 3, SUCCEEDED: 11 } },
      averageSucceededAttemptMillis: 38.4,
    }),
  },
  {
    id: "health",
    method: "GET",
    path: "/actuator/health",
    summary: "Check service health",
    description: "Spring Boot actuator health; details are shown only to authorized callers.",
    params: [],
    responses: [
      { status: 200, meaning: "UP" },
      { status: 503, meaning: "DOWN or OUT_OF_SERVICE" },
    ],
    example: pretty({ status: "UP" }),
  },
]

/** Builds the request path from the parameter inputs; returns an error string for missing path params. */
export function buildPath(endpoint: Endpoint, values: Record<string, string>): { path?: string; error?: string } {
  let path = endpoint.path
  for (const param of endpoint.params.filter((p) => p.in === "path")) {
    const value = values[param.name]?.trim()
    if (!value) {
      return { error: `Write a value for ${param.name}.` }
    }
    path = path.replace(`{${param.name}}`, encodeURIComponent(value))
  }
  const query = new URLSearchParams()
  for (const param of endpoint.params.filter((p) => p.in === "query")) {
    const value = values[param.name]?.trim()
    if (value) {
      query.set(param.name, value)
    }
  }
  const qs = query.toString()
  return { path: qs ? `${path}?${qs}` : path }
}

