import type { JobPriority } from "@/api/types"

/** Ready payloads: the README's example plus the two failure simulations JobExecutor understands. */
export const PAYLOAD_PRESETS = [
  {
    id: "transfer",
    label: "Bank transfer",
    type: "BANK_TRANSFER_SETTLEMENT",
    payload: { from: "PL61109010140000071219812874", to: "PL27109010140000071219812875", amount: "1250.00", currency: "PLN" },
  },
  { id: "retryable", label: "Retryable failure", type: "RETRYABLE_DEMO", payload: { simulateRetryableFailure: true } },
  { id: "permanent", label: "Permanent failure", type: "PERMANENT_DEMO", payload: { simulatePermanentFailure: true } },
] as const

export interface FormState {
  idempotencyKey: string
  type: string
  priority: JobPriority
  maxAttempts: string
  payload: string
}

export type Errors = Partial<Record<keyof FormState, string>>

export const FIELD_ORDER: (keyof FormState)[] = ["idempotencyKey", "type", "priority", "maxAttempts", "payload"]

export function newKey(): string {
  return `job-${crypto.randomUUID()}`
}

export const initial = (): FormState => ({
  idempotencyKey: newKey(),
  type: PAYLOAD_PRESETS[0].type,
  priority: "HIGH",
  maxAttempts: "",
  payload: JSON.stringify(PAYLOAD_PRESETS[0].payload, null, 2),
})

/** Client-side checks mirror CreateJobRequest's bean validation, so most errors never reach the server. */
export function validate(form: FormState): { errors: Errors; payload?: unknown; maxAttempts?: number } {
  const errors: Errors = {}
  const key = form.idempotencyKey.trim()
  if (!key) {
    errors.idempotencyKey = "Write an idempotency key, or generate one."
  } else if (key.length > 200) {
    errors.idempotencyKey = "Keep the idempotency key to 200 characters or fewer."
  }
  const type = form.type.trim()
  if (!type) {
    errors.type = "Write the job type, for example BANK_TRANSFER_SETTLEMENT."
  } else if (type.length > 100) {
    errors.type = "Keep the job type to 100 characters or fewer."
  }
  let maxAttempts: number | undefined
  if (form.maxAttempts.trim()) {
    const value = Number(form.maxAttempts)
    if (!Number.isInteger(value) || value < 1 || value > 20) {
      errors.maxAttempts = "Write a whole number from 1 to 20, or leave it empty."
    } else {
      maxAttempts = value
    }
  }
  let payload: unknown
  try {
    payload = JSON.parse(form.payload)
    if (payload === null) {
      errors.payload = "The payload cannot be null; use {} for an empty payload."
    }
  } catch (error) {
    errors.payload = `The payload is not valid JSON: ${(error as Error).message}`
  }
  return { errors, payload, maxAttempts }
}

