<script lang="ts" module>
  const stack: HTMLElement[] = []
</script>

<script lang="ts">
  import type { Snippet } from "svelte"
  import { trapFocus } from "#lib/ui/focus.ts"
  import { portal } from "./floating.ts"

  let {
    open = $bindable(false),
    class: className = "max-w-md",
    label,
    bare = false,
    onclose,
    children,
    actions,
  }: {
    open?: boolean
    class?: string
    label?: string
    bare?: boolean
    onclose?: () => void
    children: Snippet
    actions?: Snippet
  } = $props()

  const id = $props.id()
  let panel = $state<HTMLElement>()
  let labelledby = $state<string>()

  function close() {
    open = false
    onclose?.()
  }

  function initialFocus(node: HTMLElement) {
    return (
      node.querySelector<HTMLElement>("[data-autofocus], input, textarea") ??
      node.querySelector<HTMLElement>("[data-dismiss]") ??
      node.querySelector<HTMLElement>("button:not([disabled]), a[href]") ??
      node
    )
  }

  $effect(() => {
    if (!open || !panel) return
    const node = panel
    const previous = document.activeElement as HTMLElement | null
    const heading = label ? null : node.querySelector("h1, h2, h3")
    if (heading) heading.id ||= `${id}-title`
    labelledby = heading?.id
    stack.push(node)
    initialFocus(node).focus()
    const keydown = (event: KeyboardEvent) => {
      if (stack.at(-1) !== node) return
      if (event.key === "Tab") trapFocus(event, node)
      else if (event.key === "Escape" && !event.defaultPrevented) {
        event.stopPropagation()
        close()
      }
    }
    document.addEventListener("keydown", keydown)
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      stack.splice(stack.indexOf(node), 1)
      document.removeEventListener("keydown", keydown)
      document.documentElement.style.overflow = overflow
      previous?.focus()
    }
  })
</script>

{#if open}
  <div {@attach portal} class="fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-start sm:px-4 sm:pt-[14vh]">
    <button type="button" aria-label="Close" tabindex="-1" class="scrim fixed inset-0 bg-scrim" onclick={close}></button>
    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledby}
      tabindex="-1"
      class="panel relative flex max-h-[calc(100svh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl bg-raised shadow-float ring-1 ring-hairline outline-none sm:max-h-[80svh] {className}"
    >
      <div class="min-h-0 overflow-y-auto {bare ? '' : 'p-6 sm:p-7'}">{@render children()}</div>
      {#if actions}
        <div class="flex flex-wrap justify-end gap-2 px-6 pb-6 sm:px-7 sm:pb-7">{@render actions()}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @media (prefers-reduced-motion: no-preference) {
    .scrim {
      animation: fade var(--motion-standard) linear both;
    }

    .panel {
      animation: rise var(--spring-smooth-duration) var(--spring-smooth) both;
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 1rem;
      scale: 0.98;
    }
  }
</style>
