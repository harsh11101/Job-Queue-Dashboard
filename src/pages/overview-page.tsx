import { Plus } from "lucide-react"
import { Link } from "react-router"
import { useJobs, useStats } from "@/api/queries"
import { JOB_PRIORITIES, JOB_STATUSES, type JobStats, type JobStatus } from "@/api/types"
import { summarize } from "@/lib/stats"
import { BarList, StatTile, type BarRow } from "@/components/charts"
import { JobId } from "@/components/job-id"
import { PageHeader, Panel } from "@/components/layout-parts"
import { EmptyState, ErrorState, LoadingRows, Skeleton } from "@/components/states"
import { PriorityBadge, StatusBadge } from "@/components/status-badge"
import { buttonVariants } from "@/components/ui/button"
import { config } from "@/config"
import { formatCount, formatDuration, formatPercent, formatRelative } from "@/lib/format"
import { STATUS_META } from "@/lib/job-status"

function statusRows(counts: Partial<Record<JobStatus, number>>): BarRow[] {
  return JOB_STATUSES.map((status) => ({
    key: status,
    name: STATUS_META[status].label,
    label: <StatusBadge status={status} />,
    value: counts[status] ?? 0,
  }))
}

export function OverviewPage() {
  const stats = useStats()
  const recent = useJobs({ page: 0, size: 8 })

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Live counts from the job store, refreshed every ${config.pollIntervalMs / 1000} s while this tab is open.`}
        actions={
          <Link to="/jobs/new" className={buttonVariants({ variant: "primary" })}>
            <Plus aria-hidden />
            Create a job
          </Link>
        }
      />

      {stats.isError && !stats.data ? (
        <Panel>
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
        </Panel>
      ) : (
        <div className="flex flex-col gap-6">
          <StatTiles stats={stats.data} />
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Jobs by status" description="Every job in the store, by its durable state.">
              {stats.data ? (
                <BarList caption="Jobs by status" rows={statusRows(stats.data.countsByStatus)} />
              ) : (
                <LoadingRows label="Loading status counts" />
              )}
            </Panel>
            <Panel
              title="Jobs by priority"
              description="Each priority is its own Kafka lane; both lanes share one scale."
            >
              {stats.data ? <PriorityBreakdown stats={stats.data} /> : <LoadingRows label="Loading priority counts" />}
            </Panel>
          </div>

          <Panel
            title="Latest submitted jobs"
            description="The eight newest jobs by creation time."
            actions={
              <Link to="/jobs" className="m-link text-[15px] font-medium">
                See all jobs
              </Link>
            }
            bodyClassName="p-0"
          >
            {recent.isPending ? (
              <LoadingRows label="Loading latest jobs" />
            ) : recent.isError ? (
              <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
            ) : recent.data.items.length === 0 ? (
              <EmptyState
                title="No jobs yet"
                action={
                  <Link to="/jobs/new" className={buttonVariants({ size: "sm" })}>
                    Create the first job
                  </Link>
                }
              >
                Jobs you submit appear here within seconds.
              </EmptyState>
            ) : (
              <ul className="divide-y">
                {recent.data.items.map((job) => (
                  <li key={job.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
                    <JobId id={job.id} short className="w-32" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[14px]">{job.type}</span>
                    <PriorityBadge priority={job.priority} />
                    <StatusBadge status={job.status} />
                    <span className="w-28 text-right text-[14px] text-muted-foreground" title={job.createdAt}>
                      {formatRelative(job.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

        </div>
      )}
    </>
  )
}

function StatTiles({ stats }: { stats: JobStats | undefined }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6" role="status" aria-label="Loading figures">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[98px]" />
        ))}
      </div>
    )
  }
  const s = summarize(stats)
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <StatTile label="Total jobs" value={formatCount(s.total)} />
      <StatTile label="Unfinished" value={formatCount(s.unfinished)} detail="Queued, processing or retrying" />
      <StatTile label="Processing" value={formatCount(s.count("PROCESSING"))} />
      <StatTile label="Succeeded" value={formatCount(s.count("SUCCEEDED"))} />
      <StatTile label="Dead letter" value={formatCount(s.count("DLQ"))} />
      <StatTile
        label="Success rate"
        value={formatPercent(s.successRate)}
        detail={
          stats.averageSucceededAttemptMillis === null
            ? `of ${formatCount(s.finished)} finished`
            : `${formatDuration(stats.averageSucceededAttemptMillis)} mean successful attempt`
        }
      />
    </div>
  )
}

function PriorityBreakdown({ stats }: { stats: JobStats }) {
  const lanes = JOB_PRIORITIES.map((priority) => ({ priority, counts: stats.countsByPriority[priority] ?? {} }))
  const max = Math.max(1, ...lanes.flatMap((lane) => Object.values(lane.counts).map((v) => v ?? 0)))
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      {lanes.map(({ priority, counts }) => {
        const total = Object.values(counts).reduce<number>((sum, v) => sum + (v ?? 0), 0)
        return (
          <div key={priority} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between">
              <PriorityBadge priority={priority} />
              <span className="font-mono text-[14px] text-muted-foreground">{formatCount(total)} jobs</span>
            </div>
            <BarList caption={`${priority} priority jobs by status`} rows={statusRows(counts)} max={max} />
          </div>
        )
      })}
    </div>
  )
}
