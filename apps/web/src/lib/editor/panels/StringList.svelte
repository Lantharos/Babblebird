<script lang="ts">
  import type { StringRow } from "@babblebird/protocol"
  import type { Editor } from "#lib/editor/editor.svelte.ts"

  let { editor, onselect }: { editor: Editor; onselect?: () => void } = $props()
  let sentinel = $state<HTMLElement>()

  const DOTS: Record<string, string> = {
    untranslated: "bg-well ring-1 ring-inset ring-ink-muted/40",
    translated: "bg-done",
    approved: "bg-done ring-2 ring-done/30",
    review: "bg-caution",
  }

  const preview = (row: StringRow) =>
    (row.translation?.body ?? row.body)
      .replace(/^=\s*/, "")
      .split(/\n\s*\./)[0]!
      .replace(/\s+/g, " ")
  const dot = (row: StringRow) =>
    row.translation?.flags ? "bg-danger" : DOTS[row.translation?.state ?? "untranslated"]

  $effect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && editor.next && !editor.loading) void editor.more()
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  })

  $effect(() => {
    document.querySelector(`[data-string="${editor.selected}"]`)?.scrollIntoView({ block: "nearest" })
  })
</script>

<ul class="space-y-0.5" aria-label="Strings">
  {#each editor.rows as row (row.id)}
    <li>
      <button
        type="button"
        data-string={row.id}
        aria-current={row.id === editor.selected ? "true" : undefined}
        onclick={() => {
          void editor.select(row.id)
          onselect?.()
        }}
        class="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors {row.id === editor.selected ? 'bg-well' : 'hover:bg-well/60'}"
      >
        <span class="mt-2 size-2 shrink-0 rounded-full {dot(row)}"></span>
        <span class="min-w-0">
          <span class="block truncate font-mono text-[12px] text-ink-muted">{row.key}</span>
          <span class="block truncate text-body {row.translation ? '' : 'text-ink-soft'}">{preview(row)}</span>
        </span>
      </button>
    </li>
  {/each}
</ul>
<div bind:this={sentinel} class="h-8"></div>
{#if !editor.loading && !editor.rows.length}
  <p class="px-3 text-body text-ink-muted">Nothing here.</p>
{/if}
