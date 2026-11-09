import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/** Copies a value; the glyph turns into a check for 1.6 s (taste-skill motion: copy button). */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      toast.error("The browser blocked clipboard access. Select the text and copy it instead.")
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      className={cn(
        "m-press inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check aria-hidden className="size-4 text-status-good" /> : <Copy aria-hidden className="size-4" />}
    </button>
  )
}
