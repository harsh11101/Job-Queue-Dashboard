import { keepPreviousData, QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { config } from "@/config"
import { isTerminal } from "@/lib/job-status"
import { ApiError } from "./client"
import { jobsApi } from "./jobs"
import type { CreateJobRequest, JobListQuery, JobPriority } from "./types"

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 4xx will not change by asking again; network blips get two more tries.
        retry: (failureCount, error) => !(error instanceof ApiError && error.kind === "http") && failureCount < 2,
        staleTime: 2_000,
        // Polling stops while the tab is hidden (refetchIntervalInBackground defaults to false).
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}

export const queryKeys = {
  stats: ["stats"] as const,
  health: ["health"] as const,
  jobs: (query: JobListQuery) => ["jobs", query] as const,
  job: (id: string) => ["job", id] as const,
  attempts: (id: string) => ["job", id, "attempts"] as const,
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => jobsApi.stats(signal),
    refetchInterval: config.pollIntervalMs,
  })
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => jobsApi.health(signal),
    refetchInterval: Math.max(config.pollIntervalMs, 15_000),
    retry: false,
  })
}

export function useJobs(query: JobListQuery, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.jobs(query),
    queryFn: ({ signal }) => jobsApi.list(query, signal),
    placeholderData: keepPreviousData,
    refetchInterval: options.poll === false ? false : config.pollIntervalMs,
  })
}

/** Polls only while the job can still change; a finished job stops polling. */
export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.job(id),
    queryFn: ({ signal }) => jobsApi.get(id, signal),
    refetchInterval: (query) => (query.state.data && isTerminal(query.state.data.status) ? false : config.pollIntervalMs),
  })
}

export function useAttempts(id: string, poll: boolean) {
  return useQuery({
    queryKey: queryKeys.attempts(id),
    queryFn: ({ signal }) => jobsApi.attempts(id, signal),
    refetchInterval: poll ? config.pollIntervalMs : false,
  })
}

export function useCreateJob() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateJobRequest) => jobsApi.create(body),
    onSuccess: ({ job }) => {
      client.setQueryData(queryKeys.job(job.id), job)
      void client.invalidateQueries({ queryKey: ["jobs"] })
      void client.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

export function useReplayJob(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (priority: JobPriority) => jobsApi.replay(id, priority),
    onSuccess: (job) => {
      client.setQueryData(queryKeys.job(id), job)
      void client.invalidateQueries({ queryKey: queryKeys.attempts(id) })
      void client.invalidateQueries({ queryKey: ["jobs"] })
      void client.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

export function useCancelJob(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => jobsApi.cancel(id),
    onSuccess: (job) => {
      client.setQueryData(queryKeys.job(id), job)
      void client.invalidateQueries({ queryKey: ["jobs"] })
      void client.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}
