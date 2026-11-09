import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-[28px] leading-tight sm:text-[32px]">{title}</h1>
        {description ? <p className="max-w-[62ch] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

/** The one card recipe: surface, 1px hairline, 8px radius. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-card", className)}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg leading-tight">{title}</h2>
            {description ? <p className="text-[14px] text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  )
}

/** A label/value pair for detail lists. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-label font-medium text-muted-foreground">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  )
}
