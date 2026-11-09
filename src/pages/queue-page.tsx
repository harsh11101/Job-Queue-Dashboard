import { ArrowRight } from "lucide-react"
import { useJobs, useStats } from "@/api/queries"
import type { JobPriority, JobStatus } from "@/api/types"
import { StatTile } from "@/components/charts"
import { JobId } from "@/components/job-id"
import { PageHeader, Panel } from "@/components/layout-parts"
import { EmptyState, ErrorState, LoadingRows } from "@/components/states"
import { PriorityBadge, StatusBadge } from "@/components/status-badge"
import { formatCount, formatRelative } from "@/lib/format"

const LANES: { priority: JobPriority; topic: string }[] = [
  { priority: "HIGH", topic: "jobs-high" },
  { priority: "LOW", topic: "jobs-low" },
]

export function QueuePage() {
  const stats = useStats()

  return (
    <>
      <PageHeader
        title="Queue"
        description="How priority shapes scheduling here: two independent Kafka lanes, not one ordered queue."
      />
      <div className="flex flex-col gap-6">
        <Pipeline />

        {stats.isError && !stats.data ? (
          <Panel>
            <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
          </Panel>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {LANES.map((lane) => {
              const counts = stats.data?.countsByPriority[lane.priority] ?? {}
              const value = (status: JobStatus) => (stats.data ? formatCount(counts[status] ?? 0) : "…")
              return (
                <Panel
                  key={lane.priority}
                  title={`${lane.priority === "HIGH" ? "High" : "Low"} priority lane`}
                  description={<span className="font-mono">{lane.topic}</span>}
                  actions={<PriorityBadge priority={lane.priority} />}
                >
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-3 gap-3">
                      <StatTile label="Waiting" value={value("QUEUED")} />
                      <StatTile label="Processing" value={value("PROCESSING")} />
                      <StatTile label="Retrying" value={value("RETRY_SCHEDULED")} />
                    </div>
                    <LaneJobs priority={lane.priority} status="PROCESSING" title="Processing now" />
                    <LaneJobs priority={lane.priority} status="QUEUED" title="Waiting, newest first" />
                  </div>
                </Panel>
              )
            })}
          </div>
        )}

        <Panel
          title="Retry lane"
          description="Failed attempts wait in the outbox until their retry time, then go to jobs-retry-5s, jobs-retry-30s or jobs-retry-2m."
          bodyClassName="p-0"
        >
          <RetryJobs />
        </Panel>
      </div>
    </>
  )
}

/** A static drawing of the real topology (KafkaConfiguration, RetryPolicy, application.yml defaults). */
function Pipeline() {
  const step = "flex min-w-0 flex-col gap-1 rounded-md border bg-background px-4 py-3"
  return (
    <Panel title="Scheduling path">
      <div className="flex flex-col gap-5">
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1.3fr]">
          <div className={step}>
            <span className="font-medium">API</span>
            <span className="text-[14px] text-muted-foreground">Job and outbox row saved in one transaction</span>
          </div>
          <ArrowRight aria-hidden className="hidden size-4 self-center text-muted-foreground md:block" />
          <div className={step}>
            <span className="font-medium">Outbox publisher</span>
            <span className="text-[14px] text-muted-foreground">Claims due rows every second (FOR UPDATE SKIP LOCKED)</span>
          </div>
          <ArrowRight aria-hidden className="hidden size-4 self-center text-muted-foreground md:block" />
          <div className="grid gap-2">
            <div className={step}>
              <span className="flex items-center justify-between gap-2 font-mono text-[14px]">
                jobs-high <PriorityBadge priority="HIGH" />
              </span>
              <span className="text-[14px] text-muted-foreground">6 consumers by default</span>
            </div>
            <div className={step}>
              <span className="flex items-center justify-between gap-2 font-mono text-[14px]">
                jobs-low <PriorityBadge priority="LOW" />
              </span>
              <span className="text-[14px] text-muted-foreground">2 consumers by default</span>
            </div>
          </div>
        </div>
        <ul className="grid gap-3 text-[15px] md:grid-cols-3">
          <li>
            <span className="font-medium">Priority buys capacity, not order.</span>{" "}
            <span className="text-muted-foreground">
              High jobs get more consumers; a low job can still finish before a high job submitted earlier.
            </span>
          </li>
          <li>
            <span className="font-medium">Order holds only within a partition.</span>{" "}
            <span className="text-muted-foreground">Each lane has several partitions keyed by idempotency key; there is no global position to show.</span>
          </li>
          <li>
            <span className="font-medium">Delivery is at least once.</span>{" "}
            <span className="text-muted-foreground">Redis leases and side-effect receipts turn redeliveries into no-ops.</span>
          </li>
        </ul>
      </div>
    </Panel>
  )
}

function LaneJobs({ priority, status, title }: { priority: JobPriority; status: JobStatus; title: string }) {
  const jobs = useJobs({ priority, status, page: 0, size: 5 })
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] font-medium">
        {title}
        {jobs.data ? <span className="ml-2 font-mono text-[14px] text-muted-foreground">{formatCount(jobs.data.totalElements)}</span> : null}
      </h3>
      <div className="rounded-md border">
        {jobs.isPending ? (
          <LoadingRows rows={2} label={`Loading ${title.toLowerCase()}`} />
        ) : jobs.isError ? (
          <ErrorState error={jobs.error} className="py-6" />
        ) : jobs.data.items.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-muted-foreground">None right now.</p>
        ) : (
          <ul className="divide-y">
            {jobs.data.items.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <JobId id={job.id} short />
                <span className="min-w-0 flex-1 truncate font-mono text-[14px]">{job.type}</span>
                <span className="text-[14px] text-muted-foreground" title={job.createdAt}>
                  {formatRelative(job.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RetryJobs() {
  const jobs = useJobs({ status: "RETRY_SCHEDULED", page: 0, size: 10 })
  if (jobs.isPending) {
    return <LoadingRows rows={3} label="Loading retrying jobs" />
  }
  if (jobs.isError) {
    return <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
  }
  if (jobs.data.items.length === 0) {
    return <EmptyState title="No job is waiting for a retry" />
  }
  return (
    <ul className="divide-y">
      {jobs.data.items.map((job) => (
        <li key={job.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <JobId id={job.id} short className="w-32" />
          <span className="min-w-0 flex-1 truncate font-mono text-[14px]">{job.type}</span>
          <StatusBadge status={job.status} />
          <span className="font-mono text-[14px]">
            attempt {job.attempt + 1} of {job.maxAttempts}
          </span>
          <span className="text-[14px] text-muted-foreground" title={job.nextRetryAt ?? undefined}>
            next {formatRelative(job.nextRetryAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}
