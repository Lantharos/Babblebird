<script lang="ts">
  import { type Shape, shapeOf } from "@babblebird/fluent"
  import type { AreaSummary, Filter } from "@babblebird/protocol"
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import Keyboard from "@lucide/svelte/icons/keyboard"
  import Search from "@lucide/svelte/icons/search"
  import { untrack } from "svelte"
  import { resource } from "#lib/api/resource.svelte.ts"
  import ContextPanel from "#lib/editor/ContextPanel.svelte"
  import { Editor } from "#lib/editor/editor.svelte.ts"
  import Shortcuts from "#lib/editor/Shortcuts.svelte"
  import SourceView from "#lib/editor/SourceView.svelte"
  import StringList from "#lib/editor/StringList.svelte"
  import TranslationForm from "#lib/editor/TranslationForm.svelte"
  import { when } from "#lib/editor/time.ts"
  import { nativeName } from "#lib/languages.ts"
  import AreaIcon from "#lib/projects/AreaIcon.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import { projectPath, projectResource } from "#lib/projects/project.svelte.ts"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import { page } from "$app/state"

  const { owner, name, lang, area } = page.params as {
    owner: string
    name: string
    lang: string
    area: string
  }
  const editor = new Editor(owner, name, area, lang)
  const project = projectResource(owner, name)
  const areas = $derived(resource<AreaSummary[]>(`${projectPath(owner, name)}/areas?lang=${lang}`))
  const current = $derived(areas.data?.find((entry) => entry.slug === area) ?? null)
  const can = $derived(project.data?.can ?? { translate: false, review: false, admin: false })
  const source = $derived<Shape | null>(editor.detail ? shapeOf(editor.detail.row.body) : null)

  let shortcuts = $state(false)
  let searchField = $state<HTMLInputElement>()
  let form = $state<TranslationForm>()
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const filters: { value: Filter; label: string }[] = [
    { value: "untranslated", label: "To do" },
    { value: "review", label: "Review" },
    { value: "problems", label: "Problems" },
    { value: "all", label: "All" },
  ]

  $effect(() => {
    void editor.filter
    untrack(() => void editor.reload().then(() => areas.refresh()))
  })

  function searchFor(event: Event & { currentTarget: HTMLInputElement }) {
    editor.search = event.currentTarget.value
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => editor.reload(), 250)
  }

  function keydown(event: KeyboardEvent) {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault()
      void editor.step(event.key === "ArrowDown" ? 1 : -1)
    } else if (!typing && event.key === "?") shortcuts = true
    else if (!typing && event.key === "/") {
      event.preventDefault()
      searchField?.focus()
    }
  }
</script>

<svelte:window onkeydown={keydown} />
<svelte:head><title>{current?.name ?? area} · {nativeName(lang)} · Babblebird</title></svelte:head>

<div class="grid h-svh grid-rows-[auto_minmax(0,1fr)]">
  <header class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
    <a href="/p/{owner}/{name}/{lang}" class="grid size-9 place-items-center rounded-full hover:bg-well" aria-label="All areas"><ArrowLeft class="size-5" /></a>
    {#if current}<AreaIcon name={current.name} icon={current.icon} class="size-9" />{/if}
    <div class="min-w-0">
      <p class="truncate font-semibold">{current?.name ?? area}</p>
      <p class="truncate text-[13px] text-ink-muted">{project.data?.name ?? name} · {nativeName(lang)}</p>
    </div>
    {#if current}
      <div class="hidden w-40 md:block">
        <ProgressBar progress={current.progress} total={current.strings} />
      </div>
    {/if}
    <div class="ml-auto flex items-center gap-2">
      <Segmented bind:value={editor.filter} options={filters} label="Show" size="sm" />
      <label class="relative hidden lg:block">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
        <input bind:this={searchField} value={editor.search} oninput={searchFor} placeholder="Search" aria-label="Search strings" class="field h-9 w-56 pl-9 text-[15px]" />
      </label>
      <button type="button" class="grid size-9 place-items-center rounded-full hover:bg-well" aria-label="Keyboard shortcuts" onclick={() => (shortcuts = true)}><Keyboard class="size-5" /></button>
    </div>
  </header>

  <div class="grid min-h-0 grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_24rem]">
    <aside class="hidden min-h-0 overflow-y-auto px-3 pb-6 md:block"><StringList {editor} /></aside>

    <main class="min-h-0 overflow-y-auto px-4 pb-16 sm:px-8">
      {#if editor.detail && source}
        {@const row = editor.detail.row}
        <div class="mx-auto max-w-2xl pt-4">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-ink-muted">
            <span class="font-mono text-ink-soft">{row.key}</span>
            <span class="font-mono">{row.file.replace("{lang}", project.data?.sourceLang ?? "en")}</span>
            {#if row.section}<span>{row.section}</span>{/if}
          </div>
          {#if row.comment}<p class="mt-3 rounded-2xl bg-well px-4 py-3 text-[15px] text-ink-soft">{row.comment}</p>{/if}
          <div class="mt-5"><SourceView shape={source} sourceLang={project.data?.sourceLang ?? "en"} glossary={editor.detail.glossary} /></div>
          {#if editor.detail.sourceChanged}
            <p class="mt-4 text-[15px] text-caution">The source changed since this was translated. It used to say: <span class="text-ink-soft">{editor.detail.sourceChanged.replace(/^=\s*/, "")}</span></p>
          {/if}
          <div class="mt-8">
            {#key row.id}
              <TranslationForm bind:this={form} {editor} detail={editor.detail} {source} {can} />
            {/key}
          </div>
          {#if row.translation?.by}
            <p class="mt-6 text-[13px] text-ink-muted">Last changed by {row.translation.by.name} · {when(row.translation.at)}</p>
          {/if}
        </div>
      {:else if editor.selected !== null}
        <div class="mx-auto max-w-2xl space-y-4 pt-4"><div class="placeholder h-8 w-1/2"></div><div class="placeholder h-24"></div></div>
      {:else if !editor.loading}
        <div class="mx-auto max-w-md pt-24 text-center">
          <p class="text-[20px] font-semibold">Nothing left here</p>
          <p class="mt-2 text-ink-soft">Every string in this view is done. Pick another filter or another area.</p>
        </div>
      {/if}
    </main>

    <aside class="hidden min-h-0 overflow-y-auto px-6 pb-12 xl:block">
      {#if editor.detail}<ContextPanel detail={editor.detail} {editor} {can} onuse={(body) => form?.use(body)} />{/if}
    </aside>
  </div>
</div>

<Shortcuts bind:open={shortcuts} />
