export * as ToolInstructions from "./instructions.js"

import { Effect, Schema } from "effect"
import { Instructions } from "../instructions/index.js"

const Names = Schema.Array(Schema.String)
type Names = typeof Names.Type

const list = (names: ReadonlyArray<string>) => names.map((name) => `\`${name}\``).join(", ")

export function update(previous: Names, current: Names) {
  const added = current.filter((name) => !previous.includes(name))
  const removed = previous.filter((name) => !current.includes(name))
  return [
    "The available tools have changed.",
    ...(added.length > 0 ? [`New tools are available in addition to those previously provided: ${list(added)}.`] : []),
    ...(removed.length > 0
      ? [`The following tools are no longer available and must not be called: ${list(removed)}.`]
      : []),
  ].join("\n\n")
}

const key = Instructions.Key.make("core/tools")
const codec = Schema.toCodecJson(Names)

/**
 * Tracks the top-level tool names the model has been shown. The request's own
 * tool list is the baseline, so nothing renders until that set changes.
 */
export const make = (names: ReadonlyArray<string>): Instructions.List =>
  Instructions.make({
    key,
    codec,
    read: Effect.succeed(Array.from(new Set(names)).sort()),
    render: { changed: update },
  })
