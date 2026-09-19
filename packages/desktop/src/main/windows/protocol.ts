import { Effect } from "effect"
import { scoped } from "../native/logging"
import { DesktopPaths } from "../paths"
import { handleRendererProtocol, setRendererProtocolReporter } from "./scheme"

export { isRendererUrl, loadWindow } from "./scheme"

// The entry module usually installs the handler before this runs; either way, route its diagnostics
// through the application log from here on.
export const registerRendererProtocol = Effect.fn("Window.registerRendererProtocol")(function* () {
  const paths = yield* DesktopPaths.resolve
  const runFork = Effect.runForkWith(yield* Effect.context<never>())
  setRendererProtocolReporter({
    warn: (message, data) => runFork(scoped("protocol", Effect.logWarning(message, data))),
    error: (message, data) => runFork(scoped("protocol", Effect.logError(message, data))),
  })
  handleRendererProtocol(paths.rendererRoot)
})
