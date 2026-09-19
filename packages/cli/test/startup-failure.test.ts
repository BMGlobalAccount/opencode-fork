import { ClientError } from "@opencode/client/promise"
import { expect, test } from "bun:test"
import { startupFailureMessage } from "../src/services/startup-failure"

const client = "0.0.0-dev-19825"
const server = "0.0.0-dev-19689"

test("names both versions when a connect failure follows a version mismatch", () => {
  expect(
    startupFailureMessage({
      error: transport(),
      clientVersion: client,
      mismatch: true,
      previousVersion: server,
    }),
  ).toBe(
    `Version mismatch: background server ${server}, this client ${client}. Could not connect to the background server.`,
  )
})

test("keeps a version mismatch visible when the replacement server exits", () => {
  expect(
    startupFailureMessage({
      error: new Error("Server process exited with code 130"),
      clientVersion: client,
      mismatch: true,
      previousVersion: server,
    }),
  ).toBe(
    `Version mismatch: background server ${server}, this client ${client}. The background server exited with code 130.`,
  )
})

test("stays short when the connect failure is not a version mismatch", () => {
  expect(startupFailureMessage({ error: transport(), clientVersion: client, mismatch: false })).toBe(
    "Could not connect to the OpenCode background server.",
  )
})

test("does not replace an unrelated startup error", () => {
  expect(
    startupFailureMessage({
      error: new Error("Config file is not valid JSON"),
      clientVersion: client,
      mismatch: true,
      previousVersion: server,
    }),
  ).toBeUndefined()
})

function transport() {
  return new Error("An error occurred in Effect.tryPromise", {
    cause: new ClientError("Transport", {
      cause: new TypeError("Unable to connect. Is the computer able to access the url?"),
    }),
  })
}
