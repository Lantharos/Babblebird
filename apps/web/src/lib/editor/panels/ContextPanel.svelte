<script lang="ts">
  import { shapeOf } from "@babblebird/fluent"
  import type { Abilities } from "@babblebird/protocol"
  import Check from "@lucide/svelte/icons/check"
  import X from "@lucide/svelte/icons/x"
  import type { Detail, Editor } from "#lib/editor/editor.svelte.ts"
  import Highlighted from "#lib/editor/text/Highlighted.svelte"
  import { when } from "#lib/format/time.ts"
  import Kbd from "#lib/ui/Kbd.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import Discussion from "./Discussion.svelte"

  let {
    detail,
    editor,
    can,
    onuse,
  }: { detail: Detail; editor: Editor; can: Abilities; onuse: (body: string) => void } = $props()
  let zoomed = $state<Detail["screenshots"][number] | null>(null)

  function text(body: string) {
    const field = shapeOf(body)?.fields.find((candidate) => candidate.name === null)
    if (!field) return body.replace(/^=\s*/, "")
    if (field.part.kind === "text") return field.part.text
    return (field.part.variants.find((variant) => variant.default) ?? field.part.variants[0])?.text ?? ""
  }
</script>

<div class="space-y-8 text-body">
  {#if detail.screenshots.length}
    <section>
      <h2 class="mb-3 font-semibold">Where it shows</h2>
      <div class="space-y-3">
        {#each detail.screenshots as shot (shot.id)}
          <button type="button" class="relative block w-full overflow-hidden rounded-2xl bg-well" onclick={() => (zoomed = shot)}>
            <img src={shot.url} alt="Screenshot: {shot.name}" width={shot.width} height={shot.height} class="block w-full" loading="lazy" />
            {#if shot.box}
              <span
                class="absolute rounded-md ring-2 ring-beak"
                style:left="{(shot.box.x / shot.width) * 100}%"
                style:top="{(shot.box.y / shot.height) * 100}%"
                style:width="{(shot.box.w / shot.width) * 100}%"
                style:height="{(shot.box.h / shot.height) * 100}%"
              ></span>
            {/if}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <Discussion {detail} {editor} canClose={can.translate || can.admin} />

  {#if detail.glossary.length}
    <section>
      <h2 class="mb-2 flex items-baseline justify-between gap-3 font-semibold">Glossary<a href="/p/{editor.owner}/{editor.name}/{editor.lang}/glossary" class="link text-small font-normal">Edit</a></h2>
      <dl class="space-y-2">
        {#each detail.glossary as term (term.id)}
          <div>
            <dt class="font-medium">{term.term}</dt>
            <dd class="text-ink-soft">{term.translation === null ? "Keep as it is" : term.translation}{#if term.note}<span class="block text-ink-muted">{term.note}</span>{/if}</dd>
          </div>
        {/each}
      </dl>
    </section>
  {/if}

  <section>
    <h2 class="mb-2 font-semibold">Seen before</h2>
    {#if detail.memory.length}
      <ul class="space-y-1">
        {#each detail.memory as match, index}
          <li>
            <button type="button" class="-mx-3 block w-[calc(100%+1.5rem)] rounded-xl px-3 py-2 text-left transition-colors hover:bg-well" onclick={() => onuse(match.body)}>
              <span class="flex items-baseline justify-between gap-3">
                <span><Highlighted text={text(match.body)} /></span>
                <span class="shrink-0 text-small text-ink-muted tabular">{Math.round(match.similarity * 100)}%</span>
              </span>
              <span class="mt-0.5 flex items-center justify-between gap-3 text-small text-ink-muted">
                <span class="truncate">{match.source}</span>
                {#if index < 5}<Kbd keys="alt+{index + 1}" />{/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-ink-muted">Nothing close has been translated yet.</p>
    {/if}
  </section>

  {#if detail.suggestions.length}
    <section>
      <h2 class="mb-2 font-semibold">Suggestions</h2>
      <ul class="space-y-3">
        {#each detail.suggestions as suggestion (suggestion.id)}
          <li class="rounded-2xl bg-well px-4 py-3">
            <p><Highlighted text={text(suggestion.body)} /></p>
            <div class="mt-2 flex items-center gap-2 text-small text-ink-muted">
              <span class="mr-auto">{suggestion.by.name} · {when(suggestion.at)}{#if suggestion.note}<span class="block text-caution">Its translation, {suggestion.note}</span>{/if}</span>
              {#if can.translate}
                <button type="button" class="button button-sm button-quiet" onclick={() => editor.accept(suggestion.id)}><Check class="size-4" />Use</button>
              {/if}
              <button type="button" class="button button-sm button-quiet" aria-label="Dismiss suggestion" onclick={() => editor.dismiss(suggestion.id)}><X class="size-4" /></button>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if detail.history.length}
    <section>
      <h2 class="mb-2 font-semibold">History</h2>
      <ol class="space-y-2">
        {#each detail.history as entry (entry.id)}
          <li>
            <p class="text-small text-ink-muted">{entry.by?.name ?? "Someone"} {entry.kind} · {when(entry.at)}</p>
            {#if entry.detail}<p class="text-ink-soft"><Highlighted text={text(entry.detail)} /></p>{/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}
</div>

<Dialog open={zoomed !== null} class="max-w-5xl" label={zoomed?.name} bare onclose={() => (zoomed = null)}>
  {#if zoomed}<img src={zoomed.url} alt="Screenshot: {zoomed.name}" class="block w-full" />{/if}
</Dialog>
