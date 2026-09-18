import { Icon } from "@opencode/ui/icon"
import { ProviderIcon } from "@opencode/ui/provider-icon"
import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { OpenCodeLogo } from "@/providers/opencode-logo"
import "@/settings/settings.css"

export function ProviderModelGroup(props: {
  provider: { id: string; name: string }
  name?: string
  expanded: boolean
  disabled?: boolean
  detail?: JSX.Element
  children: JSX.Element
  ref?: (element: HTMLElement) => void
  onExpandedChange: (expanded: boolean) => void
}) {
  return (
    <section
      ref={props.ref}
      class="provider-model-group"
      data-component="provider-model-group"
      data-provider={props.provider.id}
      data-expanded={props.expanded ? "" : undefined}
    >
      <h3 class="provider-model-group-header">
        <button
          type="button"
          class="provider-model-group-trigger"
          aria-expanded={props.expanded}
          disabled={props.disabled}
          onClick={() => props.onExpandedChange(!props.expanded)}
        >
          <span class="provider-model-group-label">
            <Show
              when={props.provider.id === "opencode"}
              fallback={<ProviderIcon id={props.provider.id} width={16} height={16} class="shrink-0" />}
            >
              <OpenCodeLogo class="size-4 shrink-0" />
            </Show>
            <bdi class="provider-model-group-title">{props.name ?? props.provider.name}</bdi>
            <Icon
              name="chevron-down"
              size="small"
              classList={{ "provider-model-group-chevron": true, collapsed: !props.expanded }}
            />
          </span>
          <Show when={props.detail}>
            <span class="provider-model-group-detail">{props.detail}</span>
          </Show>
        </button>
      </h3>
      <Show when={props.expanded}>
        <div class="provider-model-group-models">{props.children}</div>
      </Show>
    </section>
  )
}
