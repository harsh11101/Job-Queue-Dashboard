import type { ReactNode } from "react"
import { formatCount, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * A single-number tile (dataviz: "the answer is a stat tile, not a chart").
 */
export function StatTile({ label, value, detail, className }: { label: string; value: ReactNode; detail?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-5 py-4", className)}>
      <span className="text-label font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-[28px] leading-tight font-medium tracking-tight">{value}</span>
      {detail ? <span className="text-[14px] text-muted-foreground">{detail}</span> : null}
    </div>
  )
}

export interface BarRow {
  key: string
  /** Row label (a status badge, a lane name); identity is carried here, never by colour. */
  label: ReactNode
  value: number
  /** Accessible name for the row, e.g. "Queued". */
  name: string
}

/**
 * Horizontal bars of one series: one accent colour, magnitude only, every value
 * direct-labelled and the share in the hover title, so the rows read as a table.
 * Marks follow dataviz specs: thin bars, 4px rounded data end anchored at the baseline.
 */
export function BarList({ rows, max, caption }: { rows: BarRow[]; max?: number; caption: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const scale = max ?? Math.max(1, ...rows.map((row) => row.value))
  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((row) => {
          const share = total === 0 ? 0 : row.value / total
          return (
            <tr
              key={row.key}
              className="group"
              title={`${row.name}: ${formatCount(row.value)} (${formatPercent(share)} of ${formatCount(total)})`}
            >
              <th scope="row" className="w-40 py-1.5 pr-3 text-left font-normal">
                {row.label}
              </th>
              <td className="py-1.5">
                <div className="h-3 w-full">
                  <div
                    className="bar-fill h-full rounded-r-[4px] bg-primary opacity-85 group-hover:opacity-100"
                    style={{ transform: `scaleX(${row.value / scale})` }}
                  />
                </div>
              </td>
              <td className="w-16 py-1.5 pl-3 text-right font-mono text-[14px]">{formatCount(row.value)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
