import { ArrowRight, Dices } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ApiError } from "@/api/client"
import { useCreateJob } from "@/api/queries"
import type { Job } from "@/api/types"
import { FIELD_ORDER, initial, newKey, PAYLOAD_PRESETS, validate, type Errors, type FormState } from "./create-job-form"
import { CopyButton } from "@/components/copy-button"
import { Field, Input, Select, Textarea } from "@/components/form-controls"
import { describedBy } from "@/lib/field-a11y"
import { PageHeader, Panel } from "@/components/layout-parts"
import { StatusBadge } from "@/components/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"

export function CreateJobPage() {
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState("")
  const [result, setResult] = useState<{ job: Job; created: boolean } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const create = useCreateJob()

  const set = (field: keyof FormState) => (value: string) => setForm((current) => ({ ...current, [field]: value }))

  function focusFirst(found: Errors) {
    const first = FIELD_ORDER.find((field) => found[field])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#job-${first}`)?.focus()
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const checked = validate(form)
    setErrors(checked.errors)
    const count = Object.keys(checked.errors).length
    if (count > 0) {
      setStatus(count === 1 ? "One field needs a change." : `${count} fields need a change.`)
      focusFirst(checked.errors)
      return
    }
    setStatus("Sending")
    create.mutate(
      {
        idempotencyKey: form.idempotencyKey.trim(),
        type: form.type.trim(),
        priority: form.priority,
        payload: checked.payload,
        ...(checked.maxAttempts === undefined ? {} : { maxAttempts: checked.maxAttempts }),
      },
      {
        onSuccess: (response) => {
          setResult(response)
          if (response.created) {
            setStatus("Your job is created.")
            toast.success("Job created", { description: response.job.id })
            setForm((current) => ({ ...current, idempotencyKey: newKey() }))
          } else {
            setStatus("This idempotency key was used before, so the existing job was returned.")
            toast.info("Existing job returned", { description: "Same key and same request: no new job was created." })
          }
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === "IDEMPOTENCY_CONFLICT") {
            const found = { idempotencyKey: "This key already belongs to a job with a different type, priority or payload. Use a new key." }
            setErrors(found)
            focusFirst(found)
            setStatus("One field needs a change.")
          } else {
            setStatus(error instanceof ApiError ? error.message : "The job could not be created.")
          }
        },
      },
    )
  }

  function applyPreset(id: string) {
    const preset = PAYLOAD_PRESETS.find((p) => p.id === id)
    if (preset) {
      setForm((current) => ({ ...current, type: preset.type, payload: JSON.stringify(preset.payload, null, 2) }))
      setErrors((current) => ({ ...current, type: undefined, payload: undefined }))
    }
  }

  return (
    <>
      <PageHeader
        title="Create a job"
        description="Submits POST /api/v1/jobs. The job and its first outbox event are saved in one transaction, then published to the lane of its priority."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-[14px] font-medium">Start from</span>
              <div className="flex flex-wrap gap-2">
                {PAYLOAD_PRESETS.map((preset) => (
                  <Button key={preset.id} type="button" size="sm" onClick={() => applyPreset(preset.id)}>
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <Field
              id="job-idempotencyKey"
              label="Idempotency key"
              hint="Sending the same key and request again returns the same job instead of creating a second one."
              error={errors.idempotencyKey}
            >
              <div className="flex gap-2">
                <Input
                  {...describedBy("job-idempotencyKey", errors.idempotencyKey, true)}
                  value={form.idempotencyKey}
                  onChange={(e) => set("idempotencyKey")(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-[15px]"
                />
                <Button type="button" onClick={() => set("idempotencyKey")(newKey())} aria-label="Generate a new idempotency key" className="px-4">
                  <Dices aria-hidden />
                  New key
                </Button>
              </div>
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field id="job-type" label="Job type" hint="Stored in upper case." error={errors.type} className="sm:col-span-1">
                <Input
                  {...describedBy("job-type", errors.type, true)}
                  value={form.type}
                  onChange={(e) => set("type")(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-[15px]"
                />
              </Field>
              <Field id="job-priority" label="Priority" hint="Picks the Kafka lane.">
                <Select
                  {...describedBy("job-priority", undefined, true)}
                  value={form.priority}
                  onChange={(e) => set("priority")(e.target.value)}
                >
                  <option value="HIGH">High</option>
                  <option value="LOW">Low</option>
                </Select>
              </Field>
              <Field id="job-maxAttempts" label="Maximum attempts" hint="1 to 20; empty uses the server default (4)." error={errors.maxAttempts}>
                <Input
                  {...describedBy("job-maxAttempts", errors.maxAttempts, true)}
                  inputMode="numeric"
                  value={form.maxAttempts}
                  onChange={(e) => set("maxAttempts")(e.target.value)}
                  placeholder="4"
                />
              </Field>
            </div>

            <Field id="job-payload" label="Payload (JSON)" error={errors.payload} hint="Any JSON value. The executor reads simulateRetryableFailure and simulatePermanentFailure.">
              <Textarea
                {...describedBy("job-payload", errors.payload, true)}
                value={form.payload}
                onChange={(e) => set("payload")(e.target.value)}
                spellCheck={false}
                rows={10}
              />
            </Field>

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center">
              <Button type="submit" variant="primary" disabled={create.isPending}>
                {create.isPending ? "Creating" : "Create job"}
              </Button>
              <p role="status" data-form-status className="text-[15px] text-muted-foreground">
                {status}
              </p>
            </div>
          </form>
        </Panel>

        <div className="flex flex-col gap-6">
          {result ? <CreatedJob result={result} /> : null}
          <Panel title="What happens next">
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-[15px] text-muted-foreground">
              <li>The outbox publisher sends the job to jobs-high or jobs-low within about a second.</li>
              <li>A worker takes a Redis lease on the job, records the attempt and runs it.</li>
              <li>A retryable failure is retried after 5 s, 30 s and 2 min; a permanent one goes to the dead letter queue.</li>
            </ol>
          </Panel>
        </div>
      </div>
    </>
  )
}

function CreatedJob({ result }: { result: { job: Job; created: boolean } }) {
  const { job, created } = result
  return (
    <Panel title={created ? "Job created" : "Existing job returned"}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-label font-medium text-muted-foreground">Job ID</span>
          <span className="flex items-center gap-1">
            <span className="min-w-0 font-mono text-[15px] break-all">{job.id}</span>
            <CopyButton value={job.id} label="job ID" />
          </span>
        </div>
        <StatusBadge status={job.status} className="self-start" />
        <Link to={`/jobs/${job.id}`} className={buttonVariants({ className: "self-start" })}>
          Open the job
          <ArrowRight aria-hidden />
        </Link>
      </div>
    </Panel>
  )
}
