import { JOB_STATUSES, type JobStats, type JobStatus } from "@/api/types"
import { UNFINISHED_STATUSES } from "@/lib/job-status"

/** Derived figures; every one is computed from GET /api/v1/jobs/stats, nothing else. */
export function summarize(stats: JobStats) {
  const count = (status: JobStatus) => stats.countsByStatus[status] ?? 0
  const total = JOB_STATUSES.reduce((sum, status) => sum + count(status), 0)
  const finished = count("SUCCEEDED") + count("DLQ")
  return {
    total,
    unfinished: UNFINISHED_STATUSES.reduce((sum, status) => sum + count(status), 0),
    successRate: finished === 0 ? null : count("SUCCEEDED") / finished,
    finished,
    count,
  }
}

