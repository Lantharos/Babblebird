<script lang="ts">
  import type { GlossaryRow } from "@babblebird/protocol"
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import Plus from "@lucide/svelte/icons/plus"
  import { api } from "#lib/api/client.ts"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { nativeName } from "#lib/format/languages.ts"
  import TermForm from "#lib/glossary/TermForm.svelte"
  import Header from "#lib/layout/Header.svelte"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import SearchField from "#lib/ui/fields/SearchField.svelte"
  import Loaded from "#lib/ui/Loaded.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import { page } from "$app/state"

  const { owner, name, lang } = page.params as { owner: string; name: string; lang: string }
  const path = `${projectPath(owner, name)}/glossary/${lang}`
  const glossary = resource<{ terms: GlossaryRow[]; editable: boolean }>(path)

  let search = $state("")
  let editing = $state<string | null>(null)
  let adding = $state(false)

  const shown = $derived.by(() => {
    const query = search.trim().toLowerCase()
    const terms = glossary.data?.terms ?? []
    return query
      ? terms.filter((row) =>
          [row.term, row.translation ?? "", row.note ?? ""].some((text) =>
            text.toLowerCase().includes(query),
          ),
        )
      : terms
  })

  async function save(term: Omit<GlossaryRow, "unsent">) {
    await api.put(path, term).catch((error) => {
      toasts.error(error)
      throw error
    })
    await glossary.refresh()
    editing = null
    adding = false
  }

  async function remove(term: string) {
    await api.delete(`${path}?${new URLSearchParams({ term })}`).catch((error) => {
      toasts.error(error)
      throw error
    })
    await glossary.refresh()
    editing = null
  }
</script>

<svelte:head><title>Glossary · {nativeName(lang)} · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page max-w-3xl pt-10 pb-24">
  <a href="/p/{owner}/{name}/{lang}" class="inline-flex items-center gap-1.5 text-body text-ink-muted hover:text-ink">
    <ArrowLeft class="size-4" />{nativeName(lang)}
  </a>
  <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
    <h1 class="title">Glossary</h1>
    {#if glossary.data?.editable && !adding}
      <button type="button" class="button button-quiet" onclick={() => ((adding = true), (editing = null))}><Plus class="size-4" />Add a term</button>
    {/if}
  </div>

  <SearchField bind:value={search} label="Search the glossary" class="mt-8" />

  <Loaded data={glossary.data} error={glossary.error} retry={() => glossary.refresh()}>
    {#snippet children(data)}
      {#if adding}
        <div class="mt-6"><TermForm row={null} onsave={save} oncancel={() => (adding = false)} /></div>
      {/if}
      <ul class="mt-6 space-y-1">
        {#each shown as row (row.term)}
          <li>
            {#if editing === row.term}
              <TermForm {row} onsave={save} onremove={() => remove(row.term)} oncancel={() => (editing = null)} />
            {:else}
              <button
                type="button"
                disabled={!data.editable}
                onclick={() => ((editing = row.term), (adding = false))}
                class="grid w-full grid-cols-1 gap-x-6 gap-y-0.5 rounded-xl px-3 py-2.5 text-left transition-colors enabled:hover:bg-well/60 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
              >
                <span class="font-medium">{row.term}</span>
                <span>
                  <span class={row.translation === null ? "text-ink-muted" : ""}>{row.translation ?? "Keep as it is"}</span>
                  {#if row.note}<span class="block text-small text-ink-muted">{row.note}</span>{/if}
                  {#if row.unsent}<span class="block text-small text-caution">Not in the repository yet</span>{/if}
                </span>
              </button>
            {/if}
          </li>
        {:else}
          <li class="px-3 text-body text-ink-muted">{search.trim() ? "Nothing matches" : "No terms yet"}</li>
        {/each}
      </ul>
    {/snippet}
  </Loaded>
</main>
