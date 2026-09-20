import { describe, expect } from "bun:test"
import { ToolInstructions } from "@opencode/core/tool/instructions"
import { Effect } from "effect"
import { it } from "../lib/effect"
import { readInitial, readUpdate } from "../lib/instructions"

describe("ToolInstructions", () => {
  it.effect("renders nothing for the baseline and announces only the delta afterwards", () =>
    Effect.gen(function* () {
      const initialized = yield* readInitial(ToolInstructions.make(["shell", "read", "edit"]))
      expect(initialized.text).toBe("")
      expect(initialized.values["core/tools"]).toEqual(["edit", "read", "shell"])

      const unchanged = yield* readUpdate(ToolInstructions.make(["edit", "shell", "read", "read"]), initialized)
      expect(unchanged.text).toBe("")

      const changed = yield* readUpdate(ToolInstructions.make(["edit", "read", "write", "glob"]), initialized)
      expect(changed.text).toBe(
        [
          "The available tools have changed.",
          "New tools are available in addition to those previously provided: `glob`, `write`.",
          "The following tools are no longer available and must not be called: `shell`.",
        ].join("\n\n"),
      )

      const restored = yield* readUpdate(ToolInstructions.make(["edit", "read", "shell", "write", "glob"]), changed)
      expect(restored.text).toBe(
        [
          "The available tools have changed.",
          "New tools are available in addition to those previously provided: `shell`.",
        ].join("\n\n"),
      )
    }),
  )

  it.effect("announces transitions to and from an empty tool set", () =>
    Effect.gen(function* () {
      const initialized = yield* readInitial(ToolInstructions.make([]))
      expect(initialized.text).toBe("")

      const added = yield* readUpdate(ToolInstructions.make(["read"]), initialized)
      expect(added.text).toBe(
        [
          "The available tools have changed.",
          "New tools are available in addition to those previously provided: `read`.",
        ].join("\n\n"),
      )

      const emptied = yield* readUpdate(ToolInstructions.make([]), added)
      expect(emptied.text).toBe(
        [
          "The available tools have changed.",
          "The following tools are no longer available and must not be called: `read`.",
        ].join("\n\n"),
      )
    }),
  )
})
