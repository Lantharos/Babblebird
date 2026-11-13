<script lang="ts">
  import type { GlossaryRow } from "@babblebird/protocol"
  import LoaderCircle from "@lucide/svelte/icons/loader-circle"
  import Chip from "#lib/ui/fields/Chip.svelte"
  import { focusOnMount } from "#lib/ui/focus.ts"

  let {
    row,
    onsave,
    onremove,
    oncancel,
  }: {
    row: GlossaryRow | null
    onsave: (term: Omit<GlossaryRow, "unsent">) => Promise<void>
    onremove?: () => Promise<void>
    oncancel: () => void
  } = $props()

  let term = $state("")
  let translation = $state("")
  let kept = $state(false)
  let note = $state("")
  let busy = $state(false)

  $effect.pre(() => {
    term = row?.term ?? ""
    translation = row?.translation ?? ""
    kept = row ? row.translation === null : false
    note = row?.note ?? ""
  })

  const ready = $derived(!!term.trim() && (kept || !!translation.trim()))

  async function run(action: () => Promise<void>) {
    busy = true
    await action().finally(() => (busy = false))
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!ready) return
    void run(() =>
      onsave({ term: term.trim(), translation: kept ? null : translation.trim(), note: note.trim() || null }),
    )
  }
</script>

<form class="space-y-3 rounded-tile bg-well/60 p-4" onsubmit={submit}>
  {#if row}
    <p class="font-medium">{row.term}</p>
  {:else}
    <input bind:value={term} class="field" placeholder="English term" aria-label="English term" maxlength="200" {@attach focusOnMount} />
  {/if}
  <div class="flex flex-wrap items-center gap-2">
    <input bind:value={translation} class="field min-w-0 flex-1" placeholder="Translation" aria-label="Translation" maxlength="200" disabled={kept} />
    <Chip pressed={kept} onclick={() => (kept = !kept)}>Keep as it is</Chip>
  </div>
  <input bind:value={note} class="field" placeholder="Note for translators" aria-label="Note" maxlength="500" />
  <div class="flex flex-wrap items-center gap-2">
    <button class="button button-primary" disabled={!ready || busy}>
      {#if busy}<LoaderCircle class="size-4 animate-spin" />{/if}
      Save
    </button>
    <button type="button" class="button button-quiet" onclick={oncancel}>Cancel</button>
    {#if onremove}
      <button type="button" class="button button-quiet ml-auto text-danger" disabled={busy} onclick={() => run(onremove)}>Remove</button>
    {/if}
  </div>
</form>
