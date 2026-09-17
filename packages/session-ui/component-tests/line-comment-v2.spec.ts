import { expect, story } from "../../storybook/playwright/story"

story("renders the line comment content editor and compact actions", async ({ mount }) => {
  const root = await mount("ui-line-comment--editor-filled")
  const editor = root.getByRole("textbox")
  await expect(editor).toHaveAttribute("contenteditable", "plaintext-only")
  await editor.fill("Updated comment\nwith context")
  await expect(editor).toHaveText("Updated comment\nwith context")
  await editor.fill("x")
  await editor.press("Backspace")
  await expect(editor).toBeEmpty()
  await expect(root.locator('[data-slot="line-comment-v2-placeholder"]')).toBeVisible()
  await editor.evaluate((element) => {
    const clipboard = new DataTransfer()
    clipboard.setData("text/plain", "Plain\ntext")
    clipboard.setData("text/html", "<strong>Rich text</strong>")
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: clipboard }))
  })
  await expect(editor).toHaveText("Plain\ntext")
  await expect(editor.locator("strong")).toHaveCount(0)
  await expect(root.locator('[data-slot="line-comment-v2-placeholder"]')).toHaveCount(0)
  await expect(root.locator("textarea")).toHaveCount(0)
  await expect(root.locator('[data-slot="line-comment-v2-label"]')).toHaveCount(0)
  await expect(root.locator('[data-slot="line-comment-v2-footer-meta"]')).toHaveCount(0)
  await expect(root.locator('[data-slot="line-comment-v2-shell"]')).toHaveCSS("padding", "0px")
  await expect(root.locator('[data-slot="line-comment-v2-editor-scroll"]')).toHaveCSS("border-top-width", "0px")
  await expect(root.locator('[data-slot="line-comment-v2-editor-scroll"]')).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  )
  await expect(root.locator('[data-slot="line-comment-v2-editor-scroll"] .scroll-view__viewport')).toHaveCSS(
    "padding",
    "12px",
  )
  await expect(root.getByRole("button", { name: "Cancel" })).toHaveAttribute("data-variant", "ghost-muted")
  await expect(root.getByRole("button", { name: "Cancel" })).toHaveAttribute("data-size", "small")
  await expect(root.getByRole("button", { name: "Comment" })).toHaveAttribute("data-variant", "submit")
  await expect(root.getByRole("button", { name: "Comment" })).toHaveAttribute("data-size", "small")
})
