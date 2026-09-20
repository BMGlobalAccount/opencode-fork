import { expect, test } from "@playwright/test"
import { fixture } from "../smoke/session-timeline.fixture"
import { mockOpenCodeServer } from "../utils/mock-server"

const cases = [
  {
    name: "portrait",
    viewport: { width: 390, height: 844 },
    insets: { top: 47, right: 0, bottom: 34, left: 0 },
    bottom: false,
  },
  {
    name: "landscape",
    viewport: { width: 844, height: 390 },
    insets: { top: 0, right: 47, bottom: 21, left: 47 },
    bottom: false,
  },
  {
    name: "portrait with bottom tabs",
    viewport: { width: 390, height: 844 },
    insets: { top: 47, right: 0, bottom: 34, left: 0 },
    bottom: true,
  },
]

for (const input of cases) {
  test.describe(input.name, () => {
    test.use({ viewport: input.viewport, hasTouch: true })

    test("keeps app navigation clear of native chrome", async ({ page }) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: input.insets })
      await mockOpenCodeServer(page, {
        directory: fixture.directory,
        project: fixture.project,
        provider: fixture.provider,
        sessions: fixture.sessions,
        pageMessages: () => ({ items: [] }),
      })
      await page.addInitScript(
        ({ bottom, directory, server, sessions }) => {
          localStorage.setItem(
            "settings.v3",
            JSON.stringify({ general: { mobileTitlebarPosition: bottom ? "bottom" : "top" } }),
          )
          localStorage.setItem(
            "opencode.global.dat:server",
            JSON.stringify({ projects: { local: [{ worktree: directory, expanded: true }] } }),
          )
          localStorage.setItem(
            "opencode.window.browser.dat:tabs",
            JSON.stringify(sessions.map((session) => ({ type: "session", server, sessionId: session.id }))),
          )
        },
        {
          bottom: input.bottom,
          directory: fixture.directory,
          server: fixture.serverKey,
          sessions: fixture.sessions,
        },
      )

      await page.goto("/")

      const titlebar = page.locator('[data-slot="titlebar-v2"]')
      await expect(titlebar).toHaveCSS("padding-left", `${input.insets.left}px`)
      await expect(titlebar).toHaveCSS("padding-right", `${input.insets.right}px`)

      if (input.bottom) {
        await expect(titlebar).toHaveCSS("padding-bottom", `${input.insets.bottom}px`)
        await expect(page.getByRole("main")).toHaveCSS("padding-top", `${input.insets.top}px`)
      } else {
        await expect(titlebar).toHaveCSS("padding-top", `${input.insets.top}px`)
      }

      const navigation =
        input.viewport.width < 768
          ? titlebar.getByRole("button", { name: "Tabs", exact: true })
          : titlebar.getByRole("button", { name: "Home", exact: true })
      await expect(navigation).toBeInViewport({ ratio: 1 })
      const bounds = await navigation.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(input.insets.left)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(input.viewport.width - input.insets.right)

      if (input.viewport.width >= 768) return
      await navigation.tap()
      await expect(navigation).toHaveAttribute("aria-expanded", "true")
    })
  })
}
