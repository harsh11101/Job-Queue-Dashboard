import { Link } from "react-router"
import { shortId } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CopyButton } from "./copy-button"

/**
 * A job id everywhere in the app: monospace, links to the job's page, and copies in
 * full. `short` shows the first 8 characters in dense tables; the title holds the rest.
 */
export function JobId({ id, short = false, className }: { id: string; short?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <Link
        to={`/jobs/${id}`}
        title={id}
        className="m-link min-w-0 truncate font-mono text-[14px] text-foreground hover:text-primary"
      >
        {short ? shortId(id) : id}
      </Link>
      <CopyButton value={id} label="job ID" />
    </span>
  )
}
