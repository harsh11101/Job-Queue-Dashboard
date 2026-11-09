import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

const controlClass =
  "w-full rounded-sm border border-input bg-transparent px-3 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-[140ms] focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_25%,transparent)] focus-visible:outline-none aria-invalid:border-status-critical disabled:opacity-50"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, "h-11", className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-40 py-2 font-mono text-[14px] leading-relaxed", className)} {...props} />
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlClass, "h-11 cursor-pointer bg-card pr-8", className)} {...props}>
      {children}
    </select>
  )
}

/**
 * A field with a visible label above it and its error under it (taste-skill forms):
 * the error is wired through aria-describedby and the control gets aria-invalid.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[14px] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[14px] text-status-critical">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[14px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
