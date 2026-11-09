/**
 * Types mirroring the backend's HTTP contract (com.github.pants.jobqueue.api).
 * Timestamps are ISO-8601 strings; JSON payloads/results arrive as serialized strings.
 */

/** The states the backend writes, in lifecycle order. */
export const JOB_STATUSES = ["QUEUED", "PROCESSING", "RETRY_SCHEDULED", "SUCCEEDED", "DLQ", "CANCELLED"] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_PRIORITIES = ["HIGH", "LOW"] as const
export type JobPriority = (typeof JOB_PRIORITIES)[number]

/** JobResponse */
export interface Job {
  id: string
  idempotencyKey: string
  type: string
  priority: JobPriority
  status: JobStatus
  attempt: number
  maxAttempts: number
  nextRetryAt: string | null
  payloadJson: string
  resultJson: string | null
  errorMessage: string | null
  failureClass: string | null
  traceId: string
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

/** JobAttemptResponse */
export interface JobAttempt {
  attempt: number
  status: JobStatus
  topic: string
  errorMessage: string | null
  failureClass: string | null
  startedAt: string
  finishedAt: string | null
}

/** JobPageResponse */
export interface JobPage {
  items: Job[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** JobStatsResponse */
export interface JobStats {
  countsByStatus: Partial<Record<JobStatus, number>>
  countsByPriority: Partial<Record<JobPriority, Partial<Record<JobStatus, number>>>>
  averageSucceededAttemptMillis: number | null
}

/** CreateJobRequest */
export interface CreateJobRequest {
  idempotencyKey: string
  type: string
  priority: JobPriority
  payload: unknown
  maxAttempts?: number
}

/** ReplayJobRequest */
export interface ReplayJobRequest {
  priority: JobPriority
}

/** ErrorResponse */
export interface ErrorBody {
  code: string
  message: string
  timestamp: string
}

export interface JobListQuery {
  status?: JobStatus
  priority?: JobPriority
  type?: string
  createdFrom?: string
  createdTo?: string
  page: number
  size: number
}

/** Spring Boot actuator health (details hidden unless authorized). */
export interface Health {
  status: "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN" | string
}
