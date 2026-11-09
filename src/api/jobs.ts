import { request } from "./client"
import type {
  CreateJobRequest,
  Health,
  Job,
  JobAttempt,
  JobListQuery,
  JobPage,
  JobPriority,
  JobStats,
} from "./types"

/** One function per backend endpoint; every screen goes through these. */
export const jobsApi = {
  /** POST /api/v1/jobs — 201 when created, 200 when the idempotency key already existed. */
  async create(body: CreateJobRequest): Promise<{ job: Job; created: boolean }> {
    const { status, data } = await request<Job>("/api/v1/jobs", { method: "POST", body })
    return { job: data, created: status === 201 }
  },

  /** GET /api/v1/jobs */
  async list(query: JobListQuery, signal?: AbortSignal): Promise<JobPage> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value))
      }
    }
    return (await request<JobPage>(`/api/v1/jobs?${params}`, { signal })).data
  },

  /** GET /api/v1/jobs/{id} */
  async get(id: string, signal?: AbortSignal): Promise<Job> {
    return (await request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}`, { signal })).data
  },

  /** GET /api/v1/jobs/{id}/attempts */
  async attempts(id: string, signal?: AbortSignal): Promise<JobAttempt[]> {
    return (await request<JobAttempt[]>(`/api/v1/jobs/${encodeURIComponent(id)}/attempts`, { signal })).data
  },

  /** GET /api/v1/jobs/idempotency/{key} */
  async getByIdempotencyKey(key: string, signal?: AbortSignal): Promise<Job> {
    return (await request<Job>(`/api/v1/jobs/idempotency/${encodeURIComponent(key)}`, { signal })).data
  },

  /** POST /api/v1/jobs/{id}/replay — only for jobs in DLQ. */
  async replay(id: string, priority: JobPriority): Promise<Job> {
    return (
      await request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}/replay`, { method: "POST", body: { priority } })
    ).data
  },

  /** POST /api/v1/jobs/{id}/cancel — only for QUEUED, RETRY_SCHEDULED or DLQ jobs; final. */
  async cancel(id: string): Promise<Job> {
    return (await request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" })).data
  },

  /** GET /api/v1/jobs/stats */
  async stats(signal?: AbortSignal): Promise<JobStats> {
    return (await request<JobStats>("/api/v1/jobs/stats", { signal })).data
  },

  /** GET /actuator/health */
  async health(signal?: AbortSignal): Promise<Health> {
    return (await request<Health>("/actuator/health", { signal })).data
  },
}
