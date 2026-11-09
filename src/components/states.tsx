import { CloudOff, Inbox, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { ApiError } from "@/api/client"
import { apiDisplayOrigin } from "@/config"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]", className)} />
}

/** Placeholder rows shown while a list loads the first time. */
export function LoadingRows({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Inbox aria-hidden className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {children ? <div className="max-w-md text-muted-foreground">{children}</div> : null}
      {action}
    </div>
  )
}

/** Explains a failed request; distinguishes "backend unreachable" from an error answer. */
export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const apiError = error instanceof ApiError ? error : null
  const unreachable = apiError?.unreachable ?? false
  const Icon = unreachable ? CloudOff : TriangleAlert
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <Icon aria-hidden className="size-6 text-status-critical" />
      <p className="font-medium">{unreachable ? "Backend unavailable" : "Request failed"}</p>
      <p className="max-w-md text-muted-foreground">
        {apiError?.message ?? "Something went wrong while loading this view."}
        {unreachable ? <span className="mt-1 block font-mono text-[14px]">{apiDisplayOrigin}</span> : null}
      </p>
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
