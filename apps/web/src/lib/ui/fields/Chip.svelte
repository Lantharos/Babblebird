<script lang="ts">
  import X from "@lucide/svelte/icons/x"
  import type { Snippet } from "svelte"

  let {
    pressed,
    onclick,
    onremove,
    remove,
    children,
  }: {
    pressed?: boolean
    onclick?: () => void
    onremove?: () => void
    remove?: string
    children: Snippet
  } = $props()
</script>

{#if onremove}
  <span class="inline-flex h-8 items-center gap-0.5 rounded-full bg-well pr-0.5 pl-3.5 text-sm">
    {@render children()}
    <button type="button" class="grid size-7 place-items-center rounded-full transition-colors hover:bg-tint" aria-label={remove} onclick={onremove}><X class="size-3.5" /></button>
  </span>
{:else}
  <button
    type="button"
    aria-pressed={pressed}
    {onclick}
    class="inline-flex h-8 items-center rounded-full px-3.5 text-sm transition-colors {pressed ? 'bg-accent text-accent-ink' : 'bg-well hover:bg-tint'}"
  >
    {@render children()}
  </button>
{/if}
