import { Link } from "react-router"
import { PageHeader } from "@/components/layout-parts"
import { buttonVariants } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <PageHeader
      title="Page not found"
      description="This address does not match a page of the dashboard."
      actions={
        <Link to="/" className={buttonVariants()}>
          Go to the overview
        </Link>
      }
    />
  )
}
