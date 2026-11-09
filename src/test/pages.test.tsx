import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { emptyPage, makeJob, mockFetch, renderApp, route } from "./utils"

const stats = {
  countsByStatus: { QUEUED: 1, SUCCEEDED: 3, DLQ: 1 },
  countsByPriority: { HIGH: { SUCCEEDED: 3 }, LOW: { QUEUED: 1, DLQ: 1 } },
  averageSucceededAttemptMillis: 42,
}
const health = route("GET", "/actuator/health", 200, { status: "UP" })

describe("overview", () => {
  it("shows figures computed from the stats endpoint and the latest jobs", async () => {
    mockFetch(health, route("GET", "/api/v1/jobs/stats", 200, stats), route("GET", "/api/v1/jobs", 200, { ...emptyPage, items: [makeJob()], totalElements: 1, totalPages: 1 }))
    renderApp("/")

    expect(await screen.findByText("75%")).toBeInTheDocument()
    expect(screen.getByText("42 ms mean successful attempt")).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: "3f2c9a1e" })).toHaveAttribute("href", "/jobs/3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f")
  })

  it("says the backend is unavailable when it cannot be reached", async () => {
    mockFetch()
    renderApp("/")
    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})

describe("jobs list", () => {
  it("shows the empty state when there are no jobs", async () => {
    mockFetch(health, route("GET", "/api/v1/jobs", 200, emptyPage))
    renderApp("/jobs")
    expect(await screen.findByText("No jobs yet")).toBeInTheDocument()
  })

  it("sends filters and pages to the backend", async () => {
    const page = { items: [makeJob()], page: 0, size: 20, totalElements: 45, totalPages: 3 }
    const { calls } = mockFetch(health, route("GET", "/api/v1/jobs", 200, page))
    const user = userEvent.setup()
    renderApp("/jobs")

    expect(await screen.findByText("1–20 of 45")).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText("Status"), "DLQ")
    await waitFor(() => expect(calls.some((c) => c.url.searchParams.get("status") === "DLQ")).toBe(true))

    await user.click(screen.getByRole("button", { name: "Next page" }))
    await waitFor(() =>
      expect(calls.some((c) => c.url.searchParams.get("status") === "DLQ" && c.url.searchParams.get("page") === "1")).toBe(true),
    )
  })

  it("finds a job by idempotency key and opens it", async () => {
    mockFetch(
      health,
      route("GET", "/api/v1/jobs", 200, emptyPage),
      route("GET", "/api/v1/jobs/idempotency/transfer-1", 200, makeJob()),
      route("GET", "/api/v1/jobs/3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f", 200, makeJob()),
      route("GET", /\/attempts$/, 200, []),
    )
    const user = userEvent.setup()
    const { router } = renderApp("/jobs")

    await user.type(await screen.findByLabelText("Find a job by ID or idempotency key"), "transfer-1")
    await user.click(screen.getByRole("button", { name: "Find job" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/jobs/3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f"))
  })
})

describe("create job", () => {
  it("shows errors under their fields and sends nothing when the form is invalid", async () => {
    const { calls } = mockFetch(health)
    const user = userEvent.setup()
    renderApp("/jobs/new")

    const payload = await screen.findByLabelText("Payload (JSON)")
    await user.clear(payload)
    await user.type(payload, "not json")
    await user.click(screen.getByRole("button", { name: "Create job" }))

    expect(screen.getByText(/The payload is not valid JSON/)).toBeInTheDocument()
    expect(payload).toHaveAttribute("aria-invalid", "true")
    expect(payload).toHaveFocus()
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0)
  })

  it("submits the request and shows the new job ID with a link to it", async () => {
    const created = makeJob({ status: "QUEUED", attempt: 0 })
    const { calls } = mockFetch(health, route("POST", "/api/v1/jobs", 201, created))
    const user = userEvent.setup()
    renderApp("/jobs/new")

    await user.click(await screen.findByRole("button", { name: "Create job" }))

    expect(await screen.findByRole("heading", { name: "Job created" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Open the job/ })).toHaveAttribute("href", `/jobs/${created.id}`)
    const post = calls.find((c) => c.method === "POST")!
    expect(post.body).toMatchObject({ type: "BANK_TRANSFER_SETTLEMENT", priority: "HIGH", payload: { currency: "PLN" } })
    expect(post.body).not.toHaveProperty("maxAttempts")
  })

  it("puts an idempotency conflict under the key field", async () => {
    mockFetch(health, route("POST", "/api/v1/jobs", 409, { code: "IDEMPOTENCY_CONFLICT", message: "conflict", timestamp: "" }))
    const user = userEvent.setup()
    renderApp("/jobs/new")

    await user.click(await screen.findByRole("button", { name: "Create job" }))

    expect(await screen.findByText(/already belongs to a job with a different/)).toBeInTheDocument()
    expect(screen.getByLabelText("Idempotency key")).toHaveAttribute("aria-invalid", "true")
  })
})

describe("job detail", () => {
  const id = "3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f"

  it("shows the payload, metadata and attempt history", async () => {
    mockFetch(
      health,
      route("GET", `/api/v1/jobs/${id}`, 200, makeJob()),
      route("GET", `/api/v1/jobs/${id}/attempts`, 200, [
        { attempt: 1, status: "SUCCEEDED", topic: "jobs-high", errorMessage: null, failureClass: null, startedAt: "2026-11-09T08:30:00.000Z", finishedAt: "2026-11-09T08:30:00.250Z" },
      ]),
    )
    renderApp(`/jobs/${id}`)

    expect(await screen.findByRole("heading", { name: "BANK_TRANSFER_SETTLEMENT" })).toBeInTheDocument()
    expect(screen.getByText(id)).toBeInTheDocument()
    expect(screen.getByText(/"amount": "10.00"/)).toBeInTheDocument()
    expect(await screen.findByText("jobs-high")).toBeInTheDocument()
    expect(screen.getByText("250 ms")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Replay job" })).not.toBeInTheDocument()
  })

  it("says so when the job does not exist", async () => {
    mockFetch(health, route("GET", `/api/v1/jobs/${id}`, 404, { code: "JOB_NOT_FOUND", message: "Job not found", timestamp: "" }), route("GET", /attempts$/, 404, {}))
    renderApp(`/jobs/${id}`)
    expect(await screen.findByText("No job with this ID")).toBeInTheDocument()
  })

  it("cancels a queued job only after confirmation", async () => {
    const queued = makeJob({ status: "QUEUED" })
    const { calls } = mockFetch(
      health,
      route("GET", `/api/v1/jobs/${id}`, 200, queued),
      route("GET", `/api/v1/jobs/${id}/attempts`, 200, []),
      route("POST", `/api/v1/jobs/${id}/cancel`, 200, { ...queued, status: "CANCELLED" }),
    )
    const user = userEvent.setup()
    renderApp(`/jobs/${id}`)

    await user.click(await screen.findByRole("button", { name: "Cancel job" }))
    const dialog = await screen.findByRole("dialog")
    expect(calls.some((c) => c.method === "POST")).toBe(false)
    expect(screen.queryByRole("button", { name: "Replay job" })).toBeNull()

    await user.click(within(dialog).getByRole("button", { name: "Cancel job" }))

    await waitFor(() =>
      expect(calls.some((c) => c.method === "POST" && c.url.pathname === `/api/v1/jobs/${id}/cancel`)).toBe(true),
    )
  })

  it("offers no cancel for a running job", async () => {
    mockFetch(
      health,
      route("GET", `/api/v1/jobs/${id}`, 200, makeJob({ status: "PROCESSING" })),
      route("GET", `/api/v1/jobs/${id}/attempts`, 200, []),
    )
    renderApp(`/jobs/${id}`)

    expect(await screen.findAllByText("Processing")).not.toHaveLength(0)
    expect(screen.queryByRole("button", { name: "Cancel job" })).toBeNull()
  })

  it("replays a dead-letter job only after confirmation", async () => {
    const dlq = makeJob({ status: "DLQ", attempt: 2, errorMessage: "boom", failureClass: "x.RetryableJobException", completedAt: null })
    const { calls } = mockFetch(
      health,
      route("GET", `/api/v1/jobs/${id}`, 200, dlq),
      route("GET", `/api/v1/jobs/${id}/attempts`, 200, []),
      route("POST", `/api/v1/jobs/${id}/replay`, 200, { ...dlq, status: "QUEUED", priority: "LOW" }),
    )
    const user = userEvent.setup()
    renderApp(`/jobs/${id}`)

    await user.click(await screen.findByRole("button", { name: "Replay job" }))
    const dialog = await screen.findByRole("dialog")
    expect(calls.some((c) => c.method === "POST")).toBe(false)

    await user.selectOptions(within(dialog).getByLabelText("Lane for the replay"), "LOW")
    await user.click(within(dialog).getByRole("button", { name: "Replay job" }))

    await waitFor(() => expect(calls.find((c) => c.method === "POST")?.body).toEqual({ priority: "LOW" }))
  })
})
