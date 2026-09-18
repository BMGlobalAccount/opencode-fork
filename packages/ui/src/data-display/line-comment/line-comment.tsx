import { For, Show, createEffect, createSignal, onMount, splitProps, type ComponentProps, type JSX } from "solid-js"
import { FileIcon } from "@opencode/ui/file-icon"
import { useI18n } from "../../context/i18n"
import { useFilteredList } from "../../hooks"
import { Button } from "@opencode/ui/button"
import { ScrollView } from "@opencode/ui/scroll-view"
import "./line-comment.css"

/** Horizontal “more” glyph for the display-card overflow control (Figma outline-dots). */
export function LineCommentOverflowIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      width={props.width ?? 16}
      height={props.height ?? 16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={props["aria-hidden"] ?? "true"}
    >
      <path d="M2.5 7.5H3.5V8.5H2.5V7.5Z" stroke="currentColor" />
      <path d="M7.5 7.5H8.5V8.5H7.5V7.5Z" stroke="currentColor" />
      <path d="M12.5 7.5H13.5V8.5H12.5V7.5Z" stroke="currentColor" />
    </svg>
  )
}

export interface LineCommentProps extends ComponentProps<"div"> {
  /** Main comment body (text or rich content). */
  comment: JSX.Element
  /** Line / selection context (e.g. “Comment on line 40”). */
  selection: JSX.Element
  /** Typically an overflow menu trigger; use `LineCommentOverflowIcon` inside `line-comment-v2-overflow`. */
  actions?: JSX.Element
}

export function LineComment(props: LineCommentProps) {
  const [local, rest] = splitProps(props, ["comment", "selection", "actions", "class", "classList"])
  return (
    <div
      {...rest}
      data-component="line-comment-v2"
      data-variant="display"
      classList={{
        ...local.classList,
        [local.class ?? ""]: !!local.class,
      }}
    >
      <div data-slot="line-comment-v2-shell">
        <div data-slot="line-comment-v2-column">
          <div data-slot="line-comment-v2-text">{local.comment}</div>
          <div data-slot="line-comment-v2-meta">{local.selection}</div>
        </div>
        <Show when={local.actions}>{(actions) => <div data-slot="line-comment-v2-tools">{actions()}</div>}</Show>
      </div>
    </div>
  )
}

export type LineCommentEditorMention = {
  items: (query: string) => string[] | Promise<string[]>
}

const mentionCursorKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"])

export interface LineCommentEditorProps extends Omit<ComponentProps<"div">, "children" | "onInput" | "onSubmit"> {
  /** Accessible editor label (default: “Comment”). */
  heading?: JSX.Element | string
  value: string
  onInput: (value: string) => void
  onCancel: () => void
  onSubmit: (value: string) => void
  selection: JSX.Element
  placeholder?: string
  rows?: number
  cancelLabel?: string
  submitLabel?: string
  autofocus?: boolean
  mention?: LineCommentEditorMention
}

function pathFilename(path: string) {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))
  return index === -1 ? path : path.slice(index + 1)
}

function pathDirectory(path: string) {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))
  return index === -1 ? "" : path.slice(0, index + 1)
}

export function LineCommentEditor(props: LineCommentEditorProps) {
  const i18n = useI18n()
  let editorRef: HTMLDivElement | undefined
  const [mentionOpen, setMentionOpen] = createSignal(false)

  const [local, rest] = splitProps(props, [
    "heading",
    "value",
    "onInput",
    "onCancel",
    "onSubmit",
    "selection",
    "placeholder",
    "rows",
    "cancelLabel",
    "submitLabel",
    "autofocus",
    "mention",
    "class",
    "classList",
  ])

  const canSubmit = () => local.value.trim().length > 0

  const editorSelection = () => {
    const root = editorRef?.getRootNode()
    if (root instanceof ShadowRoot) {
      return (root as unknown as { getSelection?: () => Selection | null }).getSelection?.() ?? window.getSelection()
    }
    return window.getSelection()
  }

  const editorValue = () => {
    const editor = editorRef
    if (!editor?.textContent) return ""
    return editor.innerText.replaceAll("\r", "")
  }

  const cursorOffset = () => {
    const editor = editorRef
    const selection = editorSelection()
    if (!editor || !selection?.isCollapsed || !selection.rangeCount || !editor.contains(selection.focusNode)) return
    const range = selection.getRangeAt(0).cloneRange()
    range.selectNodeContents(editor)
    range.setEnd(selection.focusNode!, selection.focusOffset)
    return range.toString().length
  }

  const setCursorOffset = (offset: number) => {
    const editor = editorRef
    const selection = editorSelection()
    if (!editor || !selection) return
    const node = editor.firstChild ?? editor.appendChild(document.createTextNode(""))
    const range = document.createRange()
    range.setStart(node, Math.min(offset, node.textContent?.length ?? 0))
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const writeEditor = (value: string, cursor?: number) => {
    const editor = editorRef
    if (!editor) return
    editor.textContent = value
    if (cursor !== undefined) setCursorOffset(cursor)
  }

  const paste = (event: ClipboardEvent) => {
    event.preventDefault()
    const text = event.clipboardData?.getData("text/plain")
    if (!text) return
    const normalized = text.replace(/\r\n?/g, "\n")
    const multiline = normalized.includes("\n")
    const value = multiline
      ? normalized.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      : normalized
    if (
      typeof document.execCommand === "function" &&
      document.execCommand(multiline ? "insertHTML" : "insertText", false, value)
    )
      return

    const editor = editorRef
    const selection = editorSelection()
    if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return
    const range = selection.getRangeAt(0)
    range.deleteContents()
    const node = document.createTextNode(normalized)
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: normalized }))
  }

  const closeMention = () => {
    setMentionOpen(false)
    mention.clear()
  }

  const currentMention = () => {
    const editor = editorRef
    if (!editor) return
    if (!local.mention) return
    const end = cursorOffset()
    if (end === undefined) return
    const match = editorValue().slice(0, end).match(/@(\S*)$/)
    if (!match) return

    return {
      query: match[1] ?? "",
      start: end - match[0].length,
      end,
    }
  }

  function selectMention(item: { path: string } | undefined) {
    if (!item) return

    const query = currentMention()
    if (!editorRef || !query) return

    const current = editorValue()
    const value = `${current.slice(0, query.start)}@${item.path} ${current.slice(query.end)}`
    const cursor = query.start + item.path.length + 2

    writeEditor(value, cursor)
    local.onInput(value)
    closeMention()

    requestAnimationFrame(() => {
      editorRef?.focus()
      setCursorOffset(cursor)
    })
  }

  const mention = useFilteredList<{ path: string }>({
    items: async (query) => {
      if (!local.mention) return []
      if (!query.trim()) return []
      const paths = await local.mention.items(query)
      return paths.map((path) => ({ path }))
    },
    key: (item) => item.path,
    filterKeys: ["path"],
    skipFilter: () => true,
    onSelect: selectMention,
  })

  const syncMention = () => {
    const item = currentMention()
    if (!item) {
      closeMention()
      return
    }

    setMentionOpen(true)
    mention.onInput(item.query)
  }

  const selectActiveMention = () => {
    const items = mention.flat()
    if (items.length === 0) return
    const active = mention.active()
    selectMention(items.find((item) => item.path === active) ?? items[0])
  }

  const submit = () => {
    const v = local.value.trim()
    if (!v) return
    local.onSubmit(v)
  }

  createEffect(() => {
    const value = local.value
    if (!editorRef || editorValue() === value) return
    writeEditor(value)
  })

  onMount(() => {
    if (local.autofocus === false) return
    requestAnimationFrame(() => editorRef?.focus())
  })

  return (
    <div
      {...rest}
      data-component="line-comment-v2"
      data-variant="editor"
      classList={{
        ...local.classList,
        [local.class ?? ""]: !!local.class,
      }}
    >
      <div data-slot="line-comment-v2-shell">
        <div data-slot="line-comment-v2-field">
          <ScrollView data-slot="line-comment-v2-editor-scroll" orientation="vertical">
            <div
              ref={(el) => {
                editorRef = el
                writeEditor(local.value)
              }}
              data-slot="line-comment-v2-editor"
              role="textbox"
              aria-label={typeof local.heading === "string" ? local.heading : i18n.t("ui.lineComment.submit")}
              aria-multiline="true"
              contentEditable="plaintext-only"
              dir="auto"
              style={{ "unicode-bidi": "plaintext", "text-align": "start" }}
              onInput={(event) => {
                const value = event.currentTarget.textContent ? event.currentTarget.innerText.replaceAll("\r", "") : ""
                local.onInput(value)
                syncMention()
              }}
              onPaste={paste}
              onPointerUp={() => syncMention()}
              onKeyUp={(event) => {
                const selectAll =
                  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "a"
                if (!selectAll && !mentionCursorKeys.has(event.key)) return
                syncMention()
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.isComposing || e.keyCode === 229) return

                if (mentionOpen()) {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    closeMention()
                    return
                  }

                  if (e.key === "Tab") {
                    if (mention.flat().length === 0) return
                    e.preventDefault()
                    selectActiveMention()
                    return
                  }

                  const nav = e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter"
                  const ctrlNav = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key === "n" || e.key === "p")
                  if ((nav || ctrlNav) && mention.flat().length > 0) {
                    mention.onKeyDown(e)
                    e.preventDefault()
                    return
                  }
                }

                if (e.key === "Escape") {
                  e.preventDefault()
                  e.currentTarget.blur()
                  local.onCancel()
                  return
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <Show when={!local.value}>
              <div data-slot="line-comment-v2-placeholder" dir="auto">
                {local.placeholder ?? i18n.t("ui.lineComment.contextPlaceholder")}
              </div>
            </Show>
          </ScrollView>
          <Show when={mentionOpen() && mention.flat().length > 0}>
            <div data-slot="line-comment-v2-mention-list">
              <For each={mention.flat().slice(0, 10)}>
                {(item) => {
                  const directory = item.path.endsWith("/") ? item.path : pathDirectory(item.path)
                  const name = item.path.endsWith("/") ? "" : pathFilename(item.path)
                  return (
                    <button
                      type="button"
                      data-slot="line-comment-v2-mention-item"
                      data-active={mention.active() === item.path ? "" : undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => mention.setActive(item.path)}
                      onClick={() => selectMention(item)}
                    >
                      <FileIcon node={{ path: item.path, type: "file" }} class="shrink-0 size-4" />
                      <div data-slot="line-comment-v2-mention-path">
                        <span data-slot="line-comment-v2-mention-dir">{directory}</span>
                        <Show when={name}>
                          <span data-slot="line-comment-v2-mention-file">{name}</span>
                        </Show>
                      </div>
                    </button>
                  )
                }}
              </For>
            </div>
          </Show>
        </div>
        <div data-slot="line-comment-v2-footer">
          <div data-slot="line-comment-v2-footer-actions">
            <Button type="button" size="small" variant="ghost-muted" onClick={() => local.onCancel()}>
              {local.cancelLabel ?? i18n.t("ui.lineComment.cancel")}
            </Button>
            <Button type="button" size="small" variant="submit" disabled={!canSubmit()} onClick={submit}>
              {local.submitLabel ?? i18n.t("ui.lineComment.submit")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
