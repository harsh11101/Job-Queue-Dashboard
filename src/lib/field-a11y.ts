/** Props that connect a control to its Field's error or hint. */
export function describedBy(id: string, error?: string | null, hint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const
}
