<script lang="ts">
  import { type Shape, shapeOf } from "@babblebird/fluent"
  import type { AreaSummary, Filter } from "@babblebird/protocol"
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import Keyboard from "@lucide/svelte/icons/keyboard"
  import List from "@lucide/svelte/icons/list"
  import Search from "@lucide/svelte/icons/search"
  import { tick, untrack } from "svelte"
  import { MediaQuery } from "svelte/reactivity"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { getSession } from "#lib/api/session.svelte.ts"
  import { Editor } from "#lib/editor/editor.svelte.ts"
  import TranslationForm from "#lib/editor/form/TranslationForm.svelte"
  import ContextPanel from "#lib/editor/panels/ContextPanel.svelte"
  import Shortcuts from "#lib/editor/panels/Shortcuts.svelte"
  import StringList from "#lib/editor/panels/StringList.svelte"
  import SourceDiff from "#lib/editor/text/SourceDiff.svelte"
  import SourceView from "#lib/editor/text/SourceView.svelte"
  import { nativeName } from "#lib/format/languages.ts"
  import { when } from "#lib/format/time.ts"
  import AreaIcon from "#lib/projects/AreaIcon.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import { projectPath, projectResource } from "#lib/projects/project.svelte.ts"
  import SearchField from "#lib/ui/fields/SearchField.svelte"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import { page } from "$app/state"

  const { owner, name, lang, area } = page.params as {
    owner: string
    name: string
    lang: string
    area: string
  }
  const session = getSession()
  const areas = resource<AreaSummary[]>(`${projectPath(owner, name)}/areas?lang=${lang}`)
  const editor = new Editor(
    owner,
    name,
    area,
    lang,
    () => session.me?.id ?? null,
    (slug, progress) => {
      const entry = areas.data?.find((candidate) => candidate.slug === slug)
      if (entry) entry.progress = progress
    },
  )
  const project = projectResource(owner, name)
  const areaNames = $derived(new Map(areas.data?.map((entry) => [entry.slug, entry.name])))
  const current = $derived(areas.data?.find((entry) => entry.slug === area) ?? null)
  const can = $derived(project.data?.can ?? { translate: false, review: false, admin: false })
  const source = $derived<Shape | null>(editor.detail ? shapeOf(editor.detail.row.body) : null)

  const roomy = new MediaQuery("min-width: 64rem")
  const wide = new MediaQuery("min-width: 80rem")
  let shortcuts = $state(false)
  let searching = $state(false)
  let listing = $state(false)
  let searchField = $state<HTMLInputElement>()
  let form = $state<TranslationForm>()
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  const searchShown = $derived(roomy.current || searching || !!editor.search)

  const filters: { value: Filter; label: string }[] = [
    { value: "untranslated", label: "To do" },
    { value: "review", label: "Review" },
    { value: "problems", label: "Problems" },
    { value: "all", label: "All" },
  ]

  $effect(() => {
    editor.live.open()
    return () => editor.live.close()
  })

  $effect(() => {
    void editor.filter
    untrack(() => void editor.reload().then(() => areas.refresh()))
  })

  function searchFor() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => editor.reload(), 250)
  }

  async function focusSearch() {
    searching = true
    await tick()
    searchField?.focus()
  }

  function keydown(event: KeyboardEvent) {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault()
      void editor.step(event.key === "ArrowDown" ? 1 : -1)
    } else if (!typing && event.key === "?") shortcuts = true
    else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault()
      void focusSearch()
    }
  }
</script>

<svelte:window onkeydown={keydown} />
<svelte:head><title>{current?.name ?? area} · {nativeName(lang)} · Babblebird</title></svelte:head>

{#snippet context()}
  {#if editor.detail}<ContextPanel detail={editor.detail} {editor} {can} onuse={(body) => form?.use(body)} />{/if}
{/snippet}

<div class="grid h-svh grid-rows-[auto_minmax(0,1fr)]">
  <header class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-4 sm:px-6">
    <a href="/p/{owner}/{name}/{lang}" class="grid size-9 shrink-0 place-items-center rounded-full hover:bg-well" aria-label="All areas"><ArrowLeft class="size-5" /></a>
    {#if current}<AreaIcon name={current.name} icon={current.icon} class="size-9 shrink-0" />{/if}
    <div class="min-w-0 flex-1">
      <p class="truncate font-semibold">{current?.name ?? area}</p>
      <p class="truncate text-small text-ink-muted">{project.data?.name ?? name} · {nativeName(lang)}</p>
    </div>
    {#if current}
      <div class="hidden w-40 xl:block">
        <ProgressBar progress={current.progress} total={current.strings} />
      </div>
    {/if}
    <Segmented bind:value={editor.filter} options={filters} label="Show" size="sm" class="order-last w-full sm:order-none sm:w-auto" />
    {#if searchShown}
      <SearchField
        bind:value={editor.search}
        bind:input={searchField}
        oninput={searchFor}
        onblur={() => (searching = false)}
        label="Search strings"
        size="sm"
        class="order-last w-full lg:order-none lg:w-56"
      />
    {/if}
    <div class="flex items-center">
      {#if !searchShown}
        <button type="button" class="grid size-9 place-items-center rounded-full hover:bg-well" aria-label="Search strings" onclick={focusSearch}><Search class="size-5" /></button>
      {/if}
      <button
        type="button"
        class="grid size-9 place-items-center rounded-full md:hidden {listing ? 'bg-well' : 'hover:bg-well'}"
        aria-label="Strings"
        aria-pressed={listing}
        onclick={() => (listing = !listing)}><List class="size-5" /></button
      >
      <button type="button" class="hidden size-9 place-items-center rounded-full hover:bg-well sm:grid" aria-label="Keyboard shortcuts" onclick={() => (shortcuts = true)}><Keyboard class="size-5" /></button>
    </div>
  </header>

  <div class="grid min-h-0 grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_24rem]">
    <aside class="{listing ? '' : 'hidden'} min-h-0 overflow-y-auto px-3 pb-6 md:block"><StringList {editor} {areaNames} onselect={() => (listing = false)} /></aside>

    <main class="{listing ? 'hidden' : ''} min-h-0 overflow-y-auto px-4 pb-16 sm:px-8 md:block">
      {#if editor.detail && source}
        {@const row = editor.detail.row}
        <div class="mx-auto max-w-2xl pt-6">
          <SourceView shape={source} sourceLang={project.data?.sourceLang ?? "en"} glossary={editor.detail.glossary} />
          {#if editor.detail.sourceChanged}
            <div class="mt-3"><SourceDiff before={editor.detail.sourceChanged} after={row.body} /></div>
          {/if}
          {#if row.comment || row.section}
            <div class="mt-3 space-y-1 text-body">
              {#if row.comment}<p class="text-ink-soft">{row.comment}</p>{/if}
              {#if row.section}<p class="text-ink-muted">{row.section}</p>{/if}
            </div>
          {/if}
          <div class="mt-8">
            {#key row.id}
              <TranslationForm bind:this={form} {editor} detail={editor.detail} {source} {can} />
            {/key}
          </div>
          <p class="mt-6 flex flex-wrap gap-x-3 gap-y-1 text-small text-ink-muted">
            <span class="font-mono break-all">{row.key}</span>
            <span class="font-mono break-all">{row.file.replace("{lang}", project.data?.sourceLang ?? "en")}</span>
            {#if row.translation?.by}<span>Last changed by {row.translation.by.name} · {when(row.translation.at)}</span>{/if}
          </p>
          {#if !wide.current}<div class="mt-12">{@render context()}</div>{/if}
        </div>
      {:else if editor.selected !== null}
        <div class="mx-auto max-w-2xl space-y-4 pt-4"><div class="placeholder h-8 w-1/2"></div><div class="placeholder h-24"></div></div>
      {:else if !editor.loading}
        <div class="mx-auto max-w-md pt-24 text-center">
          {#if editor.search.trim()}
            <p class="text-[20px] font-semibold">Nothing matches</p>
            <p class="mt-2 text-ink-soft">Try other words.</p>
          {:else}
            <p class="text-[20px] font-semibold">Nothing left here</p>
            <p class="mt-2 text-ink-soft">Every string in this view is done. Pick another filter or another area.</p>
          {/if}
        </div>
      {/if}
    </main>

    {#if wide.current}
      <aside class="min-h-0 overflow-y-auto px-6 pb-12">{@render context()}</aside>
    {/if}
  </div>
</div>

<Shortcuts bind:open={shortcuts} />
