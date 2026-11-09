import { QueryClient } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { vi } from "vitest"
import type { Job } from "@/api/types"
import { Providers } from "@/providers"
import { routes } from "@/routes"

export interface MockCall {
  method: string
  url: URL
  body: unknown
}

type Handler = (call: MockCall) => { status: number; body?: unknown } | undefined

/**
 * Stubs fetch with a list of handlers (first match wins) and records every call.
 * An unmatched request fails the way an unreachable backend does.
 */
export function mockFetch(...handlers: Handler[]) {
  const calls: MockCall[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost")
    const call: MockCall = {
      method: init?.method ?? "GET",
      url,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    }
    calls.push(call)
    for (const handler of handlers) {
      const result = handler(call)
      if (result) {
        return new Response(result.body === undefined ? "" : JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json" },
        })
      }
    }
    throw new TypeError("Failed to fetch")
  })
  vi.stubGlobal("fetch", fetchMock)
  return { calls, fetchMock }
}

export const route =
  (method: string, path: string | RegExp, status: number, body?: unknown): Handler =>
  (call) =>
    call.method === method && (typeof path === "string" ? call.url.pathname === path : path.test(call.url.pathname))
      ? { status, body }
      : undefined

export function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <Providers client={client}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...utils, router }
}

export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f",
    idempotencyKey: "transfer-1",
    type: "BANK_TRANSFER_SETTLEMENT",
    priority: "HIGH",
    status: "SUCCEEDED",
    attempt: 1,
    maxAttempts: 4,
    nextRetryAt: null,
    payloadJson: '{"amount":"10.00"}',
    resultJson: '{"effectCreated":true}',
    errorMessage: null,
    failureClass: null,
    traceId: "trace-1",
    createdAt: "2026-11-09T08:30:00Z",
    updatedAt: "2026-11-09T08:30:01Z",
    completedAt: "2026-11-09T08:30:01Z",
    ...overrides,
  }
}

export const emptyPage = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
