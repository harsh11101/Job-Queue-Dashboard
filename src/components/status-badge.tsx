import { ChevronsUp, ChevronDown } from "lucide-react"
import type { JobPriority } from "@/api/types"
import { statusMeta } from "@/lib/job-status"
import { cn } from "@/lib/utils"

/** A job state as icon + label; the colour sits on the icon only, never on the words. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status)
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-label font-medium whitespace-nowrap",
        className,
      )}
      title={meta.description}
    >
      <Icon aria-hidden className={cn("size-3.5", meta.tone)} />
      {meta.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: JobPriority | string }) {
  const high = priority === "HIGH"
  const Icon = high ? ChevronsUp : ChevronDown
  return (
    <span className="inline-flex items-center gap-1 text-label font-medium whitespace-nowrap">
      <Icon aria-hidden className={cn("size-3.5", high ? "text-foreground" : "text-muted-foreground")} />
      {high ? "High" : priority === "LOW" ? "Low" : priority}
    </span>
  )
}
