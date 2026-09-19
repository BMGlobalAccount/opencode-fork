import { Button } from "@opencode/ui/button"
import { Wordmark } from "@opencode/ui/wordmark"
import { useLanguage } from "@/runtime/i18n/language"
import { isLoopback } from "./browser"
import "./screen.css"

// The hosted app cannot reach plain-HTTP servers (mixed content), so a pairing link that only
// carries such addresses hands the browser over to the server's own web UI instead.
export function ConnectLocalScreen(props: { urls: readonly string[] }) {
  const language = useLanguage()
  const target = props.urls.find((url) => !isLoopback(new URL(url))) ?? props.urls[0]
  const loopback = isLoopback(new URL(target))
  return (
    <main data-component="connect-server" aria-labelledby="server-connect-title">
      <div class="server-connect-content">
        <div class="server-connect-brand" role="img" aria-label="OpenCode">
          <Wordmark />
        </div>
        <header>
          <h1 id="server-connect-title">
            {language.t(loopback ? "server.connect.local.loopback.title" : "server.connect.local.title")}
          </h1>
          <p>{language.t(loopback ? "server.connect.local.loopback.description" : "server.connect.local.description")}</p>
        </header>
        <Button
          variant="contrast"
          size="large"
          onClick={() => location.assign(`${new URL("/connect", target)}${location.search}${location.hash}`)}
        >
          {language.t(loopback ? "server.connect.local.loopback.open" : "server.connect.local.open")}
        </Button>
        <footer>
          <p>{language.t(loopback ? "server.connect.local.loopback.fix" : "server.connect.local.fix")}</p>
          <code dir="ltr">{loopback ? "opencode service set hostname 0.0.0.0" : target}</code>
        </footer>
      </div>
    </main>
  )
}
