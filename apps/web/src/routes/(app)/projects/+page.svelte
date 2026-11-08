<script lang="ts">
  import type { ProjectSummary } from "@babblebird/protocol"
  import { api } from "#lib/api/client.ts"
  import { session } from "#lib/api/session.svelte.ts"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import Importing from "#lib/projects/Importing.svelte"
  import LanguageSelect from "#lib/projects/LanguageSelect.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import { donePercent } from "#lib/projects/progress.ts"

  let projects = $state<ProjectSummary[] | null>(null)
  let more = $state(false)
  let languages = $state<string[]>([])
  let page = 0
  const lang = $derived(session.language)

  async function load(next = 0) {
    const query = new URLSearchParams({ page: String(next) })
    if (lang) query.set("lang", lang)
    const result = await api.get<{ projects: ProjectSummary[]; more: boolean; languages: string[] }>(
      `/projects?${query}`,
    )
    languages = result.languages
    projects = next ? [...(projects ?? []), ...result.projects] : result.projects
    more = result.more
    page = next
  }

  $effect(() => {
    void lang
    void load()
  })

  poll(
    () => load(),
    4000,
    () => !!projects?.some((project) => project.importing),
  )
</script>

<svelte:head><title>Help translate · Babblebird</title></svelte:head>

<Header />

<main class="page pt-10">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-[34px] font-semibold tracking-[-0.025em]">Projects you can help translate</h1>
      <p class="mt-1 text-[17px] text-ink-soft">Pick one and put it into your language. All you need is an account.</p>
    </div>
    <LanguageSelect value={lang} {languages} onchange={(next) => session.chooseLanguage(next)} />
  </div>

  {#if projects === null}
    <div class="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {#each { length: 3 } as _}<div class="placeholder h-28"></div>{/each}
    </div>
  {:else if !projects.length}
    <p class="mt-16 text-ink-muted">Nobody’s looking for translators yet. Check back soon.</p>
  {:else}
    <ul class="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {#each projects as project, index (project.slug)}
        <li class="enter" style:--order={index}>
          <a href="/p/{project.slug}{lang ? `/${lang}` : ''}" class="group block">
            <div class="flex items-center gap-3">
              <img src="https://github.com/{project.owner}.png?size=96" alt="" class="size-11 rounded-xl bg-well" loading="lazy" />
              <div class="min-w-0">
                <p class="truncate text-[17px] font-semibold group-hover:text-accent">{project.name}</p>
                <p class="truncate text-sm text-ink-muted">{project.owner}</p>
              </div>
            </div>
            {#if project.description}<p class="mt-3 line-clamp-2 text-[15px] text-ink-soft">{project.description}</p>{/if}
            {#if project.importing}
              <Importing importing={project.importing} class="mt-4" />
            {:else if lang && project.progress}
              <ProgressBar class="mt-4" progress={project.progress} total={project.strings} />
              <p class="mt-2 text-sm text-ink-muted tabular">{donePercent(project.progress, project.strings)}% done · {project.strings.toLocaleString()} strings</p>
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

<Footer />
