import { JOB_PRIORITIES, JOB_STATUSES, type JobListQuery, type JobPriority, type JobStatus } from "@/api/types"

export const PAGE_SIZES = [10, 20, 50, 100]

/** Filters live in the URL, so a filtered view can be linked, reloaded and navigated back to. */
export function readQuery(params: URLSearchParams): JobListQuery {
  const status = params.get("status")
  const priority = params.get("priority")
  const size = Number(params.get("size"))
  const page = Number(params.get("page"))
  return {
    status: JOB_STATUSES.includes(status as JobStatus) ? (status as JobStatus) : undefined,
    priority: JOB_PRIORITIES.includes(priority as JobPriority) ? (priority as JobPriority) : undefined,
    type: params.get("type")?.trim() || undefined,
    createdFrom: dateParam(params.get("from"), false),
    createdTo: dateParam(params.get("to"), true),
    page: Number.isInteger(page) && page > 0 ? page : 0,
    size: PAGE_SIZES.includes(size) ? size : 20,
  }
}

/** A yyyy-mm-dd day as the start of that day (from) or the start of the next day (to), local time. */
function dateParam(value: string | null, endOfDay: boolean): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined
  }
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  if (endOfDay) {
    date.setDate(date.getDate() + 1)
  }
  return date.toISOString()
}

