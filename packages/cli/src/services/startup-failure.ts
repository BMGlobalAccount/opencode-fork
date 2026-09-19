import { ClientError } from "@opencode/client/promise"
import { Effect } from "effect"
import { OPENCODE_VERSION } from "../version"
import { ServiceConfig } from "./service-config"

export function startupFailureMessage(input: {
  readonly error: unknown
  readonly clientVersion: string
  readonly mismatch: boolean
  readonly previousVersion?: string
}) {
  if (!connectionFailure(input.error)) return undefined
  const code = serverExitCode(input.error)
  const failed = code
    ? `The background server exited with code ${code}.`
    : "Could not connect to the background server."
  if (!input.mismatch) {
    if (code) return `The OpenCode background server exited with code ${code}.`
    return "Could not connect to the OpenCode background server."
  }
  const previous =
    input.previousVersion && input.previousVersion !== input.clientVersion
      ? `background server ${input.previousVersion}, `
      : ""
  return `Version mismatch: ${previous}this client ${input.clientVersion}. ${failed}`
}

export const report = Effect.fn("cli.startup-failure.report")(function* (input: {
  readonly error: unknown
  readonly mismatch: boolean
  readonly previousVersion?: string
  readonly notify: (message: string) => Promise<void>
}) {
  const registered = yield* ServiceConfig.registeredVersion()
  const previous =
    input.previousVersion ?? (registered !== undefined && registered !== OPENCODE_VERSION ? registered : undefined)
  const message = startupFailureMessage({
    error: input.error,
    clientVersion: OPENCODE_VERSION,
    mismatch: input.mismatch || previous !== undefined,
    previousVersion: previous,
  })
  if (!message) return false
  yield* Effect.logError("background service connection failed", {
    cause: input.error,
    previousVersion: previous,
    clientVersion: OPENCODE_VERSION,
  })
  yield* Effect.promise(() => input.notify(message))
  process.stderr.write(message + "\n")
  process.exitCode = 1
  return true
})

function connectionFailure(error: unknown) {
  return chain(error).some(
    (item) =>
      (item instanceof ClientError && item.reason === "Transport") ||
      (item instanceof Error && connectionMessage.test(item.message)),
  )
}

function serverExitCode(error: unknown) {
  const message = chain(error).find(
    (item): item is Error => item instanceof Error && /Server process exited with code \d+/.test(item.message),
  )?.message
  return message?.match(/Server process exited with code (\d+)/)?.[1]
}

function chain(error: unknown, seen = new Set<unknown>()): unknown[] {
  if (typeof error !== "object" || error === null || seen.has(error)) return []
  seen.add(error)
  return [error, ...chain("cause" in error ? error.cause : undefined, seen)]
}

const connectionMessage =
  /Unable to connect|Server process exited with code|Could not reach server|Timed out waiting for the background service|Background service failed to start|Failed to start server/

export * as StartupFailure from "./startup-failure"
