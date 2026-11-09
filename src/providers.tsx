import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/lib/theme"

export function Providers({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
