import {
  Ban,
  CircleCheck,
  CircleDashed,
  Clock3,
  LoaderCircle,
  OctagonX,
  RotateCw,
  type LucideIcon,
} from "lucide-react"
import type { JobStatus } from "@/api/types"

export interface StatusMeta {
  label: string
  /** One plain sentence on what the state means in this system. */
  description: string
  icon: LucideIcon
  /** Tailwind text colour class for the icon only; the label always stays in ink. */
  tone: string
}

/** Every job state the backend writes, in lifecycle order. */
export const STATUS_META: Record<JobStatus, StatusMeta> = {
  QUEUED: {
    label: "Queued",
    description: "Saved with an outbox event; waiting to be published to its Kafka lane and picked up.",
    icon: Clock3,
    tone: "text-status-idle",
  },
  PROCESSING: {
    label: "Processing",
    description: "A worker holds the Redis lease and is running the attempt.",
    icon: LoaderCircle,
    tone: "text-status-progress",
  },
  RETRY_SCHEDULED: {
    label: "Retry scheduled",
    description: "The last attempt failed with a retryable error; the next attempt is due at the retry time.",
    icon: RotateCw,
    tone: "text-status-warning",
  },
  SUCCEEDED: {
    label: "Succeeded",
    description: "Finished; its side-effect receipt is recorded, so redeliveries are ignored.",
    icon: CircleCheck,
    tone: "text-status-good",
  },
  DLQ: {
    label: "Dead letter",
    description: "Failed permanently or used every attempt. It can be replayed or cancelled.",
    icon: OctagonX,
    tone: "text-status-critical",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "Cancelled before it could run again. Final: it is never run or replayed.",
    icon: Ban,
    tone: "text-status-idle",
  },
}

export const UNKNOWN_STATUS: StatusMeta = {
  label: "Unknown",
  description: "A state this dashboard does not know.",
  icon: CircleDashed,
  tone: "text-status-idle",
}

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status as JobStatus] ?? UNKNOWN_STATUS
}

/** SUCCEEDED, DLQ and CANCELLED never change on their own (a DLQ job changes only by replay or cancel). */
export function isTerminal(status: string): boolean {
  return status === "SUCCEEDED" || status === "DLQ" || status === "CANCELLED"
}

/** States the backend accepts a cancel for (POST /api/v1/jobs/{id}/cancel). */
export function isCancellable(status: string): boolean {
  return status === "QUEUED" || status === "RETRY_SCHEDULED" || status === "DLQ"
}

/** States in which a job still waits for or receives work. */
export const UNFINISHED_STATUSES: JobStatus[] = ["QUEUED", "PROCESSING", "RETRY_SCHEDULED"]
