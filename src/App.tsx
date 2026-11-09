import { useState } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"
import { createQueryClient } from "@/api/queries"
import { Providers } from "@/providers"
import { routes } from "@/routes"

export default function App() {
  const [client] = useState(createQueryClient)
  const [router] = useState(() => createBrowserRouter(routes))
  return (
    <Providers client={client}>
      <RouterProvider router={router} />
    </Providers>
  )
}
