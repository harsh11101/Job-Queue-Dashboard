import { Play } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { ApiError, apiUrl, sendRaw, type RawResponse } from "@/api/client"
import { CopyButton } from "@/components/copy-button"
import { Field, Input, Textarea } from "@/components/form-controls"
import { PageHeader, Panel } from "@/components/layout-parts"
import { Button } from "@/components/ui/button"
import { apiDisplayOrigin } from "@/config"
import { prettyJson, UUID_PATTERN } from "@/lib/format"
import { cn } from "@/lib/utils"
import { buildPath, ENDPOINTS, type Endpoint } from "./api-explorer-data"

export function ApiExplorerPage() {
  const [selected, setSelected] = useState(ENDPOINTS[0].id)
  const endpoint = ENDPOINTS.find((e) => e.id === selected) ?? ENDPOINTS[0]

  return (
    <>
      <PageHeader
        title="API explorer"
        description={
          <>
            Every endpoint the service exposes, sent live from this browser to{" "}
            <span className="font-mono text-[15px] text-foreground">{apiDisplayOrigin}</span>.
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Endpoints">
          <ul className="flex flex-col gap-1">
            {ENDPOINTS.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelected(e.id)}
                  aria-current={e.id === selected ? "true" : undefined}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]",
                    e.id === selected && "bg-[color-mix(in_oklab,var(--foreground)_9%,transparent)]",
                  )}
                >
                  <MethodTag method={e.method} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium">{e.summary}</span>
                    <span className="block truncate font-mono text-[13px] text-muted-foreground">{e.path}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {/* key resets the form state when another endpoint is chosen */}
        <EndpointView key={endpoint.id} endpoint={endpoint} />
      </div>
    </>
  )
}

function MethodTag({ method }: { method: "GET" | "POST" }) {
  return (
    <span
      className={cn(
        "inline-flex w-12 shrink-0 justify-center rounded-sm border px-1.5 py-0.5 font-mono text-[13px] font-medium",
        method === "POST" ? "border-primary text-primary" : "text-muted-foreground",
      )}
    >
      {method}
    </span>
  )
}

function EndpointView({ endpoint }: { endpoint: Endpoint }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(endpoint.params.map((p) => [p.name, p.example])),
  )
  const [body, setBody] = useState(endpoint.body ?? "")
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<RawResponse | null>(null)
  const [running, setRunning] = useState(false)
  const built = buildPath(endpoint, values)

  async function execute() {
    if (built.error) {
      setError(built.error)
      return
    }
    if (endpoint.body !== undefined) {
      try {
        JSON.parse(body)
      } catch (caught) {
        setError(`The request body is not valid JSON: ${(caught as Error).message}`)
        return
      }
    }
    setError(null)
    setRunning(true)
    try {
      setResponse(await sendRaw(built.path!, { method: endpoint.method, rawBody: endpoint.body !== undefined ? body : undefined }))
    } catch (caught) {
      setResponse(null)
      setError(caught instanceof ApiError ? caught.message : "The request failed.")
    } finally {
      setRunning(false)
    }
  }

  const curl = [
    `curl -i -X ${endpoint.method} '${apiUrl(built.path ?? endpoint.path)}'`,
    ...(endpoint.body !== undefined ? [`  -H 'Content-Type: application/json'`, `  -d '${body.replace(/\s*\n\s*/g, " ")}'`] : []),
  ].join(" \\\n")

  const createdId = response && response.status === 201 ? safeId(response.body) : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Panel>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MethodTag method={endpoint.method} />
            <code className="font-mono text-[15px] break-all">{endpoint.path}</code>
          </div>
          <div>
            <h2 className="text-xl">{endpoint.summary}</h2>
            <p className="mt-1 max-w-[62ch] text-muted-foreground">{endpoint.description}</p>
          </div>
          <table className="w-full max-w-xl border-collapse text-left text-[14px]">
            <caption className="sr-only">Response codes</caption>
            <tbody>
              {endpoint.responses.map((r) => (
                <tr key={r.status} className="border-b last:border-b-0">
                  <th scope="row" className="w-14 py-1.5 font-mono font-medium">
                    {r.status}
                  </th>
                  <td className="py-1.5 text-muted-foreground">{r.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Request">
        <div className="flex flex-col gap-5">
          {endpoint.params.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {endpoint.params.map((param) => (
                <Field
                  key={param.name}
                  id={`param-${param.name}`}
                  label={`${param.name}${param.required ? "" : " (optional)"}`}
                  hint={`${param.in === "path" ? "Path" : "Query"}: ${param.description}`}
                >
                  <Input
                    id={`param-${param.name}`}
                    aria-describedby={`param-${param.name}-hint`}
                    value={values[param.name] ?? ""}
                    onChange={(e) => setValues((current) => ({ ...current, [param.name]: e.target.value }))}
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono text-[15px]"
                  />
                </Field>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">This endpoint takes no parameters.</p>
          )}
          {endpoint.body !== undefined ? (
            <Field id="request-body" label="Request body (JSON)">
              <Textarea id="request-body" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} rows={8} />
            </Field>
          ) : null}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label font-medium text-muted-foreground">As curl</span>
              <CopyButton value={curl} label="curl command" />
            </div>
            <pre className="overflow-x-auto rounded-md border bg-background p-4 font-mono text-[13px] leading-relaxed">{curl}</pre>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="primary" onClick={execute} disabled={running}>
              <Play aria-hidden />
              {running ? "Sending" : "Send request"}
            </Button>
            {error ? (
              <p role="alert" className="text-[15px] text-status-critical">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </Panel>

      {response ? (
        <Panel
          title="Response"
          actions={
            <span className="flex items-center gap-3 font-mono text-[14px]">
              <span className={cn("font-medium", response.status >= 400 ? "text-status-critical" : "text-status-good")}>
                {response.status} {response.statusText}
              </span>
              <span className="text-muted-foreground">{response.durationMs} ms</span>
            </span>
          }
          bodyClassName="p-0"
        >
          {createdId ? (
            <p className="border-b px-5 py-3 text-[15px]">
              Created job{" "}
              <Link to={`/jobs/${createdId}`} className="m-link font-mono text-primary">
                {createdId}
              </Link>
            </p>
          ) : null}
          {response.headers.location ? (
            <p className="border-b px-5 py-3 font-mono text-[14px] text-muted-foreground">Location: {response.headers.location}</p>
          ) : null}
          <div className="flex items-center justify-end border-b px-3 py-1">
            <CopyButton value={response.body} label="response body" />
          </div>
          <pre className="max-h-[480px] overflow-auto p-5 font-mono text-[14px] leading-relaxed">
            {prettyJson(response.body) || "(empty body)"}
          </pre>
        </Panel>
      ) : (
        <Panel title="Example response" bodyClassName="p-0">
          <pre className="max-h-[420px] overflow-auto p-5 font-mono text-[14px] leading-relaxed text-muted-foreground">{endpoint.example}</pre>
        </Panel>
      )}
    </div>
  )
}

function safeId(body: string): string | null {
  try {
    const id = (JSON.parse(body) as { id?: unknown }).id
    return typeof id === "string" && UUID_PATTERN.test(id) ? id : null
  } catch {
    return null
  }
}
