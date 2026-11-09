import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { ApiError } from "@/api/client"
import { jobsApi } from "@/api/jobs"
import { useJobs } from "@/api/queries"
import { JOB_STATUSES, type Job } from "@/api/types"
import { PAGE_SIZES, readQuery } from "@/lib/job-query"
import { Field, Input, Select } from "@/components/form-controls"
import { describedBy } from "@/lib/field-a11y"
import { JobId } from "@/components/job-id"
import { PageHeader, Panel } from "@/components/layout-parts"
import { EmptyState, ErrorState, LoadingRows } from "@/components/states"
import { PriorityBadge, StatusBadge } from "@/components/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatCount, formatDateTime, formatRelative, UUID_PATTERN } from "@/lib/format"
import { STATUS_META } from "@/lib/job-status"

export function JobsPage() {
  const [params, setParams] = useSearchParams()
  const query = readQuery(params)
  const jobs = useJobs(query)
  const filtered = Boolean(query.status || query.priority || query.type || query.createdFrom || query.createdTo)

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    }
    if (resetPage) {
      next.delete("page")
    }
    setParams(next)
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every job in the store, newest first. Filters are kept in the address bar."
        actions={
          <Link to="/jobs/new" className={buttonVariants({ variant: "primary" })}>
            <Plus aria-hidden />
            Create a job
          </Link>
        }
      />

      <div className="flex flex-col gap-6">
        <FindJob />

        <Panel bodyClassName="p-0">
          <div className="grid gap-4 border-b p-5 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
            <Field id="filter-status" label="Status">
              <Select id="filter-status" value={query.status ?? ""} onChange={(e) => update({ status: e.target.value })}>
                <option value="">Any status</option>
                {JOB_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="filter-priority" label="Priority">
              <Select id="filter-priority" value={query.priority ?? ""} onChange={(e) => update({ priority: e.target.value })}>
                <option value="">Any priority</option>
                <option value="HIGH">High</option>
                <option value="LOW">Low</option>
              </Select>
            </Field>
            <TypeFilter value={query.type ?? ""} onApply={(type) => update({ type })} />
            <Field id="filter-from" label="Created from">
              <Input id="filter-from" type="date" value={params.get("from") ?? ""} onChange={(e) => update({ from: e.target.value })} />
            </Field>
            <Field id="filter-to" label="Created to">
              <Input id="filter-to" type="date" value={params.get("to") ?? ""} onChange={(e) => update({ to: e.target.value })} />
            </Field>
            <Button
              size="default"
              disabled={!filtered}
              onClick={() => setParams(params.get("size") ? new URLSearchParams({ size: params.get("size")! }) : new URLSearchParams())}
            >
              Clear filters
            </Button>
          </div>

          {jobs.isPending ? (
            <LoadingRows rows={8} label="Loading jobs" />
          ) : jobs.isError ? (
            <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
          ) : jobs.data.items.length === 0 ? (
            <EmptyState
              title={filtered ? "No jobs match these filters" : "No jobs yet"}
              action={
                filtered ? undefined : (
                  <Link to="/jobs/new" className={buttonVariants({ size: "sm" })}>
                    Create the first job
                  </Link>
                )
              }
            >
              {filtered ? "Change or clear a filter to see more jobs." : "Jobs you submit appear here within seconds."}
            </EmptyState>
          ) : (
            <>
              <JobsTable jobs={jobs.data.items} />
              <Pagination
                page={jobs.data.page}
                size={jobs.data.size}
                totalPages={jobs.data.totalPages}
                totalElements={jobs.data.totalElements}
                fetching={jobs.isFetching}
                onPage={(page) => update({ page: page === 0 ? undefined : String(page) }, false)}
                onSize={(size) => update({ size: String(size) })}
              />
            </>
          )}
        </Panel>
      </div>
    </>
  )
}

/** Type filter applies on Enter or blur, not on every keystroke, to avoid a request per letter. */
function TypeFilter({ value, onApply }: { value: string; onApply: (value: string | undefined) => void }) {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }
  const apply = () => {
    if (draft.trim() !== value) {
      onApply(draft.trim() || undefined)
    }
  }
  return (
    <Field id="filter-type" label="Job type">
      <Input
        id="filter-type"
        value={draft}
        placeholder="Any type"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            apply()
          }
        }}
      />
    </Field>
  )
}

/** Exact lookup by job ID or idempotency key, the two lookups the backend supports. */
function FindJob() {
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const input = value.trim()
    if (!input) {
      setError("Write a job ID or an idempotency key.")
      return
    }
    if (UUID_PATTERN.test(input)) {
      navigate(`/jobs/${input.toLowerCase()}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const job = await jobsApi.getByIdempotencyKey(input)
      navigate(`/jobs/${job.id}`)
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 404
          ? "No job has this idempotency key."
          : caught instanceof ApiError
            ? caught.message
            : "The lookup failed.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <Field
        id="find-job"
        label="Find a job by ID or idempotency key"
        error={error}
        className="flex-1"
      >
        <Input
          {...describedBy("find-job", error)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="3f2c9a1e-… or transfer-2026-0001"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[15px]"
        />
      </Field>
      <Button type="submit" disabled={busy} className="sm:mt-[27px]">
        <Search aria-hidden />
        {busy ? "Finding" : "Find job"}
      </Button>
    </form>
  )
}

function JobsTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead>
          <tr className="border-b text-label text-muted-foreground">
            <th scope="col" className="px-5 py-3 font-medium">Job ID</th>
            <th scope="col" className="px-3 py-3 font-medium">Type</th>
            <th scope="col" className="px-3 py-3 font-medium">Priority</th>
            <th scope="col" className="px-3 py-3 font-medium">Status</th>
            <th scope="col" className="px-3 py-3 font-medium">Attempts</th>
            <th scope="col" className="px-3 py-3 font-medium">Created</th>
            <th scope="col" className="px-3 py-3 font-medium">Last change</th>
            <th scope="col" className="px-5 py-3 font-medium">Finished</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b last:border-b-0 hover:bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]">
              <td className="px-5 py-2">
                <JobId id={job.id} short />
              </td>
              <td className="max-w-56 truncate px-3 py-2 font-mono text-[14px]" title={job.type}>
                {job.type}
              </td>
              <td className="px-3 py-2">
                <PriorityBadge priority={job.priority} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={job.status} />
              </td>
              <td className="px-3 py-2 font-mono text-[14px]">
                {job.attempt}/{job.maxAttempts}
              </td>
              <td className="px-3 py-2 text-[14px] whitespace-nowrap" title={formatDateTime(job.createdAt)}>
                {formatRelative(job.createdAt)}
              </td>
              <td className="px-3 py-2 text-[14px] whitespace-nowrap" title={formatDateTime(job.updatedAt)}>
                {formatRelative(job.updatedAt)}
              </td>
              <td className="px-5 py-2 text-[14px] whitespace-nowrap text-muted-foreground" title={formatDateTime(job.completedAt)}>
                {job.completedAt ? formatRelative(job.completedAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pagination({
  page,
  size,
  totalPages,
  totalElements,
  fetching,
  onPage,
  onSize,
}: {
  page: number
  size: number
  totalPages: number
  totalElements: number
  fetching: boolean
  onPage: (page: number) => void
  onSize: (size: number) => void
}) {
  const first = page * size + 1
  const last = Math.min(totalElements, (page + 1) * size)
  return (
    <div className="flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[14px] text-muted-foreground" aria-live="polite">
        {totalElements === 0 ? "No jobs" : `${formatCount(first)}–${formatCount(last)} of ${formatCount(totalElements)}`}
        {fetching ? " · refreshing" : ""}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="text-[14px] text-muted-foreground">
          Rows
        </label>
        <Select id="page-size" value={size} onChange={(e) => onSize(Number(e.target.value))} className="h-9 w-24">
          {PAGE_SIZES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Button size="sm" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <span className="font-mono text-[14px]">
          {page + 1}/{Math.max(1, totalPages)}
        </span>
        <Button size="sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          Next
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
