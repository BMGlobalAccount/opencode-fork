import path from "node:path"
import { pathToFileURL } from "node:url"
import { net, protocol } from "electron"
import type { BrowserWindow } from "electron"
import { documentPolicyHeader, jsCallStacksDocumentPolicy } from "./headers"

// The renderer scheme, its file handler and the window loader, kept free of Effect and logging so
// the entry module can register the scheme before ready and load the first window before the rest
// of the main process exists. Diagnostics go through a reporter the logging layer installs later.

export const rendererProtocol = "oc"
export const rendererHost = "renderer"

type Reporter = {
  warn: (message: string, data: Record<string, unknown>) => void
  error: (message: string, data: Record<string, unknown>) => void
}

let report: Reporter = {
  warn: (message, data) => console.warn(message, data),
  error: (message, data) => console.error(message, data),
}

export function setRendererProtocolReporter(reporter: Reporter) {
  report = reporter
}

// Scheme privileges can only be granted before the app is ready, so the entry module calls this
// before it loads anything else.
export function registerRendererScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: rendererProtocol,
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
        stream: true,
      },
    },
  ])
}

export function handleRendererProtocol(rendererRoot: string) {
  if (protocol.isProtocolHandled(rendererProtocol)) return
  protocol.handle(rendererProtocol, async (request) => {
    const url = new URL(request.url)
    if (url.host !== rendererHost) {
      report.warn("rejected host", { url: request.url })
      return new Response("Not found", { status: 404 })
    }
    const file = path.resolve(rendererRoot, `.${decodeURIComponent(url.pathname)}`)
    const rel = path.relative(rendererRoot, file)
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      report.warn("rejected path", { url: request.url, file })
      return new Response("Not found", { status: 404 })
    }
    try {
      const range = request.headers.get("range")
      const response = await net.fetch(pathToFileURL(file).toString(), { headers: range ? { range } : undefined })
      if (response.status >= 400) {
        report.error("fetch failed", { url: request.url, file, status: response.status, statusText: response.statusText })
      }
      return addDocumentPolicy(response, file)
    } catch (error) {
      report.error("fetch error", { url: request.url, file, error })
      return new Response("Not found", { status: 404 })
    }
  })
}

export function loadWindow(win: BrowserWindow, html: string) {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void win.loadURL(new URL(html, devUrl).toString())
    return
  }
  void win.loadURL(`${rendererProtocol}://${rendererHost}/${html}`)
}

export function isRendererUrl(value?: string, html = false) {
  if (!value || !URL.canParse(value)) return false
  const url = new URL(value)
  if (html && !url.pathname.endsWith(".html")) return false
  if (url.protocol === `${rendererProtocol}:` && url.host === rendererHost) return true
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (!devUrl || !URL.canParse(devUrl)) return false
  return url.origin === new URL(devUrl).origin
}

function addDocumentPolicy(response: Response, file: string) {
  if (!file.toLowerCase().endsWith(".html")) return response
  const headers = new Headers(response.headers)
  headers.set(documentPolicyHeader, jsCallStacksDocumentPolicy)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
