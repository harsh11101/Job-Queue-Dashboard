import { ArrowLeft, Ban, RotateCcw } from "lucide-react"
import { Fragment, useState } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { ApiError } from "@/api/client"
import { useAttempts, useCancelJob, useJob, useReplayJob } from "@/api/queries"
import type { Job, JobAttempt, JobPriority } from "@/api/types"
import { CopyButton } from "@/components/copy-button"
import { Field, Select } from "@/components/form-controls"
import { Detail, PageHeader, Panel } from "@/components/layout-parts"
import { EmptyState, ErrorState, LoadingRows, Skeleton } from "@/components/states"
import { PriorityBadge, StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { durationBetween, formatDateTime, formatDuration, formatRelative, prettyJson, UUID_PATTERN } from "@/lib/format"
import { isCancellable, isTerminal, statusMeta } from "@/lib/job-status"

export function JobDetailPage() {
  const { id = "" } = useParams()
  if (!UUID_PATTERN.test(id)) {
    return (
      <>
        <BackLink />
        <Panel>
          <EmptyState title="That is not a job ID">Job IDs are UUIDs, for example 3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f.</EmptyState>
        </Panel>
      </>
    )
  }
  return <JobDetail id={id} />
}

function BackLink() {
  return (
    <Link to="/jobs" className="m-link mb-6 inline-flex items-center gap-1.5 text-[15px] text-muted-foreground hover:text-foreground">
      <ArrowLeft aria-hidden className="size-4" />
      All jobs
    </Link>
  )
}

function JobDetail({ id }: { id: string }) {
  const job = useJob(id)
  const live = job.data ? !isTerminal(job.data.status) : true
  const attempts = useAttempts(id, live)

  if (job.isPending) {
    return (
      <>
        <BackLink />
        <div role="status" aria-label="Loading job" className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    )
  }
  if (job.isError) {
    const notFound = job.error instanceof ApiError && job.error.status === 404
    return (
      <>
        <BackLink />
        <Panel>
          {notFound ? (
            <EmptyState title="No job with this ID">
              <span className="font-mono text-[14px]">{id}</span>
            </EmptyState>
          ) : (
            <ErrorState error={job.error} onRetry={() => void job.refetch()} />
          )}
        </Panel>
      </>
    )
  }

  const data = job.data
  return (
    <>
      <BackLink />
      <PageHeader
        title={data.type}
        description={
          <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <span className="font-mono text-[15px] text-foreground">{data.id}</span>
            <CopyButton value={data.id} label="job ID" />
          </span>
        }
        actions={
          isCancellable(data.status) ? (
            <div className="flex flex-wrap gap-2">
              <CancelAction job={data} />
              {data.status === "DLQ" ? <ReplayAction job={data} /> : null}
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="State">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Status">
                <span className="flex flex-col items-start gap-1.5">
                  <StatusBadge status={data.status} />
                  <span className="text-[14px] text-muted-foreground">{statusMeta(data.status).description}</span>
                </span>
              </Detail>
              <Detail label="Priority">
                <PriorityBadge priority={data.priority} />
              </Detail>
              <Detail label="Attempts">
                <span className="font-mono">
                  {data.attempt} of {data.maxAttempts}
                </span>
              </Detail>
              {data.nextRetryAt ? (
                <Detail label="Next retry">
                  <span title={data.nextRetryAt}>
                    {formatDateTime(data.nextRetryAt)} <span className="text-muted-foreground">({formatRelative(data.nextRetryAt)})</span>
                  </span>
                </Detail>
              ) : null}
            </dl>
            {data.errorMessage ? (
              <div className="mt-5 rounded-md border border-[color-mix(in_oklab,var(--status-critical)_45%,transparent)] p-4">
                <p className="text-label font-medium text-muted-foreground">Last failure</p>
                <p className="mt-1">{data.errorMessage}</p>
                {data.failureClass ? <p className="mt-1 font-mono text-[14px] break-all text-muted-foreground">{data.failureClass}</p> : null}
              </div>
            ) : null}
          </Panel>

          <Panel title="Attempt history" description="One row per processing attempt, from the job_attempts audit table." bodyClassName="p-0">
            <Attempts query={attempts} />
          </Panel>

          <JsonPanel title="Payload" json={data.payloadJson} copyLabel="payload" />
          {data.resultJson ? <JsonPanel title="Result" json={data.resultJson} copyLabel="result" /> : null}
        </div>

        <Panel title="Metadata" className="h-fit">
          <dl className="flex flex-col gap-4">
            <Detail label="Idempotency key">
              <span className="flex items-center gap-1">
                <span className="min-w-0 font-mono text-[14px] break-all">{data.idempotencyKey}</span>
                <CopyButton value={data.idempotencyKey} label="idempotency key" />
              </span>
            </Detail>
            <Detail label="Trace ID">
              <span className="flex items-center gap-1">
                <span className="min-w-0 font-mono text-[14px] break-all">{data.traceId}</span>
                <CopyButton value={data.traceId} label="trace ID" />
              </span>
            </Detail>
            <Detail label="Created">{formatDateTime(data.createdAt)}</Detail>
            <Detail label="Last change">{formatDateTime(data.updatedAt)}</Detail>
            <Detail label="Finished">{formatDateTime(data.completedAt)}</Detail>
            <Detail label="Live updates">
              <span className="text-muted-foreground">{live ? "On, until the job finishes" : "Off, the job has finished"}</span>
            </Detail>
          </dl>
        </Panel>
      </div>
    </>
  )
}

function Attempts({ query }: { query: ReturnType<typeof useAttempts> }) {
  if (query.isPending) {
    return <LoadingRows rows={2} label="Loading attempts" />
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }
  if (query.data.length === 0) {
    return <EmptyState title="No attempts yet">The job has not been picked up by a worker.</EmptyState>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b text-label text-muted-foreground">
            <th scope="col" className="px-5 py-3 font-medium">#</th>
            <th scope="col" className="px-3 py-3 font-medium">Outcome</th>
            <th scope="col" className="px-3 py-3 font-medium">Kafka topic</th>
            <th scope="col" className="px-3 py-3 font-medium">Started</th>
            <th scope="col" className="px-5 py-3 font-medium">Duration</th>
          </tr>
        </thead>
        <tbody>
          {query.data.map((attempt: JobAttempt) => {
            const failed = attempt.errorMessage !== null || attempt.failureClass !== null
            return (
              <Fragment key={attempt.attempt}>
                <tr className={failed ? "align-top" : "border-b align-top last:border-b-0"}>
                  <td className="px-5 py-3 font-mono text-[14px]">{attempt.attempt}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={attempt.status} />
                  </td>
                  <td className="px-3 py-3 font-mono text-[14px] whitespace-nowrap">{attempt.topic}</td>
                  <td className="px-3 py-3 text-[14px] whitespace-nowrap" title={attempt.startedAt}>
                    {formatDateTime(attempt.startedAt)}
                  </td>
                  <td className="px-5 py-3 font-mono text-[14px] whitespace-nowrap">
                    {attempt.finishedAt ? formatDuration(durationBetween(attempt.startedAt, attempt.finishedAt)) : "running"}
                  </td>
                </tr>
                {failed ? (
                  // The error gets its own full-width line so long messages and class names never squeeze the columns.
                  <tr className="border-b last:border-b-0">
                    <td />
                    <td colSpan={4} className="px-3 pb-3 text-[14px]">
                      {attempt.errorMessage}
                      {attempt.failureClass ? (
                        <span className="block font-mono break-all text-muted-foreground">{attempt.failureClass}</span>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function JsonPanel({ title, json, copyLabel }: { title: string; json: string; copyLabel: string }) {
  const pretty = prettyJson(json)
  return (
    <Panel title={title} actions={<CopyButton value={pretty} label={copyLabel} />} bodyClassName="p-0">
      <pre className="max-h-[420px] overflow-auto p-5 font-mono text-[14px] leading-relaxed">{pretty}</pre>
    </Panel>
  )
}

/** POST /replay, behind a confirmation: replaying runs the job again through a Kafka lane. */
function ReplayAction({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)
  const [priority, setPriority] = useState<JobPriority>(job.priority)
  const replay = useReplayJob(job.id)

  function confirm() {
    replay.mutate(priority, {
      onSuccess: () => {
        setOpen(false)
        toast.success("Replay queued", { description: `Job ${job.id} is back in the ${priority === "HIGH" ? "high" : "low"} priority lane.` })
      },
    })
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <RotateCcw aria-hidden />
        Replay job
      </Button>
      <Dialog open={open} onOpenChange={(next) => !replay.isPending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replay this dead-letter job?</DialogTitle>
            <DialogDescription>
              The job returns to QUEUED and runs again as attempt {job.attempt + 1}. Its side-effect receipt key is unchanged,
              so an effect that already happened is not repeated.
            </DialogDescription>
          </DialogHeader>
          <Field id="replay-priority" label="Lane for the replay">
            <Select id="replay-priority" value={priority} onChange={(e) => setPriority(e.target.value as JobPriority)}>
              <option value="HIGH">High priority</option>
              <option value="LOW">Low priority</option>
            </Select>
          </Field>
          {replay.isError ? (
            <p role="alert" className="text-[14px] text-status-critical">
              {replay.error instanceof ApiError ? replay.error.message : "The replay failed."}
            </p>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setOpen(false)} disabled={replay.isPending}>
              Keep in dead letter
            </Button>
            <Button variant="primary" onClick={confirm} disabled={replay.isPending}>
              {replay.isPending ? "Replaying" : "Replay job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** POST /cancel, behind a confirmation: cancelling is final and cannot be undone or replayed. */
function CancelAction({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)
  const cancel = useCancelJob(job.id)

  function confirm() {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setOpen(false)
        toast.success("Job cancelled", { description: `Job ${job.id} will not run again.` })
      },
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Ban aria-hidden />
        Cancel job
      </Button>
      <Dialog open={open} onOpenChange={(next) => !cancel.isPending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this job?</DialogTitle>
            <DialogDescription>
              {job.status === "DLQ"
                ? "The job leaves the dead letter queue as CANCELLED and can no longer be replayed."
                : "The job will not run again: its waiting messages are skipped and it ends as CANCELLED."}{" "}
              This cannot be undone. If a worker picks the job up first, the cancel is refused.
            </DialogDescription>
          </DialogHeader>
          {cancel.isError ? (
            <p role="alert" className="text-[14px] text-status-critical">
              {cancel.error instanceof ApiError ? cancel.error.message : "The cancel failed."}
            </p>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setOpen(false)} disabled={cancel.isPending}>
              Keep job
            </Button>
            <Button variant="primary" onClick={confirm} disabled={cancel.isPending}>
              {cancel.isPending ? "Cancelling" : "Cancel job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
