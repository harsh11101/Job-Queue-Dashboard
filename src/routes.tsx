import type { RouteObject } from "react-router"
import { AppShell } from "@/components/app-shell"

/** Each page is its own chunk, loaded the first time it is opened. */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import("@/pages/overview-page")).OverviewPage }) },
      { path: "jobs", lazy: async () => ({ Component: (await import("@/pages/jobs-page")).JobsPage }) },
      { path: "jobs/new", lazy: async () => ({ Component: (await import("@/pages/create-job-page")).CreateJobPage }) },
      { path: "jobs/:id", lazy: async () => ({ Component: (await import("@/pages/job-detail-page")).JobDetailPage }) },
      { path: "queue", lazy: async () => ({ Component: (await import("@/pages/queue-page")).QueuePage }) },
      { path: "api", lazy: async () => ({ Component: (await import("@/pages/api-explorer-page")).ApiExplorerPage }) },
      { path: "*", lazy: async () => ({ Component: (await import("@/pages/not-found-page")).NotFoundPage }) },
    ],
  },
]
