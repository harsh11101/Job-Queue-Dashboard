import { describe, expect, it } from "vitest"
import { ApiError, request } from "@/api/client"
import { readQuery } from "@/lib/job-query"
import { summarize } from "@/lib/stats"
import { buildPath, ENDPOINTS } from "@/pages/api-explorer-data"
import { validate } from "@/pages/create-job-form"
import { mockFetch, route } from "./utils"

describe("api client", () => {
  it("maps the backend error body to code and message", async () => {
    mockFetch(route("GET", "/api/v1/jobs/x", 409, { code: "INVALID_JOB_STATE", message: "Only DLQ jobs can be replayed", timestamp: "" }))
    const error = await request("/api/v1/jobs/x").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: "http", status: 409, code: "INVALID_JOB_STATE", message: "Only DLQ jobs can be replayed" })
  })

  it("reports an unreachable backend as a network error", async () => {
    mockFetch()
    const error = (await request("/api/v1/jobs/stats").catch((e: unknown) => e)) as ApiError
    expect(error.kind).toBe("network")
    expect(error.unreachable).toBe(true)
  })
})

describe("readQuery", () => {
  it("keeps valid filters and drops unknown values", () => {
    const query = readQuery(new URLSearchParams("status=DLQ&priority=MEDIUM&type=%20x%20&page=2&size=7"))
    expect(query).toMatchObject({ status: "DLQ", priority: undefined, type: "x", page: 2, size: 20 })
  })

  it("turns the 'to' day into an exclusive bound at the next midnight", () => {
    const query = readQuery(new URLSearchParams("from=2026-11-01&to=2026-11-01"))
    expect(new Date(query.createdTo!).getTime() - new Date(query.createdFrom!).getTime()).toBe(24 * 3600 * 1000)
  })
})

describe("summarize", () => {
  it("derives totals and success rate from the stats endpoint only", () => {
    const s = summarize({
      countsByStatus: { QUEUED: 2, PROCESSING: 1, RETRY_SCHEDULED: 1, SUCCEEDED: 6, DLQ: 2 },
      countsByPriority: {},
      averageSucceededAttemptMillis: null,
    })
    expect(s.total).toBe(12)
    expect(s.unfinished).toBe(4)
    expect(s.successRate).toBe(0.75)
  })

  it("has no success rate before any job finished", () => {
    expect(summarize({ countsByStatus: { QUEUED: 3 }, countsByPriority: {}, averageSucceededAttemptMillis: null }).successRate).toBeNull()
  })
})

describe("create job validation", () => {
  const valid = { idempotencyKey: "k", type: "T", priority: "HIGH" as const, maxAttempts: "", payload: "{}" }

  it("accepts a valid form and leaves maxAttempts to the server when empty", () => {
    const result = validate(valid)
    expect(result.errors).toEqual({})
    expect(result.maxAttempts).toBeUndefined()
  })

  it("mirrors the backend's bean validation", () => {
    const result = validate({ idempotencyKey: " ", type: "x".repeat(101), priority: "LOW", maxAttempts: "21", payload: "{oops" })
    expect(Object.keys(result.errors).sort()).toEqual(["idempotencyKey", "maxAttempts", "payload", "type"])
  })
})

describe("explorer buildPath", () => {
  const get = ENDPOINTS.find((e) => e.id === "get")!
  const list = ENDPOINTS.find((e) => e.id === "list")!

  it("requires path parameters", () => {
    expect(buildPath(get, { id: "" }).error).toMatch(/id/)
  })

  it("encodes path values and skips empty query values", () => {
    expect(buildPath(get, { id: "a/b" }).path).toBe("/api/v1/jobs/a%2Fb")
    expect(buildPath(list, { status: "DLQ", page: "", size: "5" }).path).toBe("/api/v1/jobs?status=DLQ&size=5")
  })
})
