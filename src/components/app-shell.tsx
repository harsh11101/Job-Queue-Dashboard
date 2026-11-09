import { Activity, Braces, LayoutGrid, ListTree, Menu, Moon, Plus, Sun, Waypoints, X } from "lucide-react"
import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router"
import { useHealth } from "@/api/queries"
import { apiDisplayOrigin } from "@/config"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/jobs", label: "Jobs", icon: ListTree, end: true },
  { to: "/jobs/new", label: "Create job", icon: Plus, end: true },
  { to: "/queue", label: "Queue", icon: Waypoints, end: true },
  { to: "/api", label: "API explorer", icon: Braces, end: true },
]

function HealthIndicator() {
  const health = useHealth()
  const up = health.data?.status === "UP"
  const state = health.isPending ? "Checking backend" : up ? "Backend up" : "Backend unreachable"
  return (
    <div className="flex items-center gap-2 text-label font-medium" role="status" title={apiDisplayOrigin}>
      <Activity
        aria-hidden
        className={cn("size-4", health.isPending ? "text-status-idle" : up ? "text-status-good" : "text-status-critical")}
      />
      <span>{state}</span>
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="m-press inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] hover:text-foreground"
    >
      {theme === "dark" ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
    </button>
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex h-11 items-center gap-3 rounded-sm px-3 text-[15px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] hover:text-foreground",
                isActive && "bg-[color-mix(in_oklab,var(--foreground)_9%,transparent)] text-foreground",
              )
            }
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function Mark() {
  return (
    <span className="flex items-center gap-2.5 font-heading text-[18px] font-medium tracking-tight">
      <svg aria-hidden viewBox="0 0 24 24" className="size-6">
        <rect x="3" y="4" width="18" height="4" rx="1" fill="currentColor" />
        <rect x="3" y="10" width="12" height="4" rx="1" fill="var(--p-action)" />
        <rect x="3" y="16" width="7" height="4" rx="1" fill="currentColor" opacity=".55" />
      </svg>
      Job queue
    </span>
  )
}

/** Sidebar navigation on wide screens; a header with a full-width menu sheet below 1024px. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="hidden border-r bg-card lg:flex lg:h-dvh lg:sticky lg:top-0 lg:flex-col">
        <div className="flex h-16 items-center border-b px-5">
          <Mark />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
          <NavItems />
        </nav>
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <HealthIndicator />
          <ThemeToggle />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b bg-card lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Mark />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="m-press inline-flex size-11 cursor-pointer items-center justify-center rounded-sm border border-input"
            >
              {menuOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav id="mobile-nav" aria-label="Main" className="border-t px-4 py-3">
            <NavItems onNavigate={() => setMenuOpen(false)} />
            <div className="mt-3 border-t pt-3">
              <HealthIndicator />
            </div>
          </nav>
        ) : null}
      </header>

      <main id="main" key={location.pathname} className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
