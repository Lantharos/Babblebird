<script lang="ts">
  import type { ProjectSummary } from "@babblebird/protocol"
  import { untrack } from "svelte"
  import { api } from "#lib/api/client.ts"
  import { session } from "#lib/api/session.svelte.ts"
  import { nativeName } from "#lib/format/languages.ts"
  import Header from "#lib/layout/Header.svelte"
  import Importing from "#lib/projects/Importing.svelte"
  import LanguageSelect from "#lib/projects/LanguageSelect.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import ProjectIcon from "#lib/projects/ProjectIcon.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import { donePercent } from "#lib/projects/progress.ts"
  import SearchField from "#lib/ui/fields/SearchField.svelte"
  import Segmented from "#lib/ui/fields/Segmented.svelte"

  const SHOWN_LANGUAGES = 3

  let projects = $state<ProjectSummary[] | null>(null)
  let more = $state(false)
  let languages = $state<string[]>([])
  let search = $state("")
  let needs = $state<"needs" | "all">("needs")
  let page = 0
  let generation = 0
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const mine = $derived(session.me?.languages ?? [])
  const langs = $derived(mine.length ? mine : session.language ? [session.language] : [])

  async function load(next = 0) {
    const current = ++generation
    const query = new URLSearchParams({ page: String(next) })
    if (langs.length) query.set("langs", langs.join(","))
    if (langs.length && needs === "needs") query.set("needs", "1")
    if (search.trim()) query.set("q", search.trim())
    const result = await api.get<{ projects: ProjectSummary[]; more: boolean; languages: string[] }>(
      `/projects?${query}`,
    )
    if (current !== generation) return
    languages = result.languages
    projects = next ? [...(projects ?? []), ...result.projects] : result.projects
    more = result.more
    page = next
  }

  $effect(() => {
    void langs
    void needs
    if (session.loaded) untrack(() => void load())
  })

  function searchFor() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => load(), 200)
  }

  poll(
    () => load(),
    4000,
    () => !!projects?.some((project) => project.importing),
  )
</script>

<svelte:head><title>Help translate · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page pt-10 pb-24">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="title">Projects you can help translate</h1>
      <p class="mt-1 text-[17px] text-ink-soft">
        {#if mine.length}Showing how far each one is in {mine.map(nativeName).join(", ")}. <a href="/settings" class="link">Change your languages</a>{:else}Pick a language to see what still needs translating.{/if}
      </p>
    </div>
    {#if !mine.length}
      <LanguageSelect value={session.language} {languages} onchange={(next) => session.browseIn(next)} />
    {/if}
  </div>

  <div class="mt-8 flex flex-wrap items-center gap-3">
    <SearchField bind:value={search} oninput={searchFor} label="Search projects" placeholder="Search by name, owner or description" class="min-w-60 flex-1 sm:max-w-sm" />
    {#if langs.length}
      <Segmented
        bind:value={needs}
        label="Which projects"
        options={[
          { value: "needs", label: mine.length > 1 ? "Need my languages" : `Need ${nativeName(langs[0]!)}` },
          { value: "all", label: "All projects" },
        ]}
      />
    {/if}
  </div>

  {#if projects === null}
    <div class="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {#each { length: 3 } as _}<div class="placeholder h-28"></div>{/each}
    </div>
  {:else if !projects.length}
    <p class="mt-16 text-ink-muted">
      {search.trim() ? "No project matches that." : needs === "needs" && langs.length ? "Nothing is waiting for your languages right now. Nice work." : "Nobody’s looking for translators yet. Check back soon."}
    </p>
  {:else}
    <ul class="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {#each projects as project, index (project.slug)}
        <li class="enter" style:--order={Math.min(index, 8)}>
          <a href="/p/{project.slug}{project.progress?.[0] ? `/${project.progress[0].lang}` : ''}" class="group block">
            <div class="flex items-center gap-3">
              <ProjectIcon {project} />
              <div class="min-w-0">
                <p class="truncate text-[17px] font-semibold group-hover:text-accent">{project.name}</p>
                <p class="truncate text-sm text-ink-muted">{project.owner}</p>
              </div>
            </div>
            {#if project.description}<p class="mt-3 line-clamp-2 text-body text-ink-soft">{project.description}</p>{/if}
            {#if project.importing}
              <Importing importing={project.importing} class="mt-4" />
            {:else if project.progress?.length}
              <ul class="mt-4 space-y-2">
                {#each project.progress.slice(0, SHOWN_LANGUAGES) as language (language.lang)}
                  <li class="grid grid-cols-[6rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                    <span class="truncate text-ink-soft">{nativeName(language.lang)}</span>
                    <ProgressBar progress={language} total={project.strings} />
                    <span class="text-right text-ink-muted tabular">{donePercent(language, project.strings)}%</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-4 text-sm text-ink-muted tabular">{project.strings.toLocaleString()} strings · {project.languages} languages</p>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
    {#if more}
      <button type="button" class="button button-quiet mt-12" onclick={() => load(page + 1)}>Show more</button>
    {/if}
  {/if}
</main>
