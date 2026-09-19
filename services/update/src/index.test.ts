import { describe, expect, test } from "bun:test"
import { selectRolloutFallback } from "./index"

describe("rollout fallback selection", () => {
  test("keeps a newer installed release instead of downgrading to an inactive fallback", () => {
    const current = { version: "2.0.8" }
    const fallback = { version: "2.0.6" }

    expect(selectRolloutFallback("2.0.8", fallback, current)).toBe(current)
  })

  test("offers a newer eligible fallback to an older client", () => {
    const current = { version: "2.0.1" }
    const fallback = { version: "2.0.6" }

    expect(selectRolloutFallback("2.0.1", fallback, current)).toBe(fallback)
  })

  test("returns no fallback when the newer installed release is not retained", () => {
    expect(selectRolloutFallback("2.0.8", { version: "2.0.6" }, null)).toBeNull()
  })
})
