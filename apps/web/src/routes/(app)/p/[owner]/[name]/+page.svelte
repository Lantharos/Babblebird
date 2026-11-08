<script lang="ts">
  import { session } from "#lib/api/session.svelte.ts"
  import { englishName, nativeName } from "#lib/languages.ts"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import ProjectHeader from "#lib/projects/ProjectHeader.svelte"
  import { donePercent } from "#lib/projects/progress.ts"
  import { projectResource } from "#lib/projects/project.svelte.ts"
  import { page } from "$app/state"

  const project = $derived(projectResource(page.params.owner!, page.params.name!))
  const languages = $derived(
    [...(project.data?.languages ?? [])].sort((a, b) =>
      a.lang === session.language
        ? -1
        : b.lang === session.language
          ? 1
          : nativeName(a.lang).localeCompare(nativeName(b.lang)),
    ),
  )
</script>

<svelte:head><title>{project.data?.name ?? "Project"} · Babblebird</title></svelte:head>

<Header />

<main class="page pt-10">
  {#if project.error}
    <p class="text-danger">{project.error.message}</p>
  {:else if project.data}
    <ProjectHeader project={project.data} />
    <ul class="mt-8 grid gap-x-10 sm:grid-cols-2">
      {#each languages as language (language.lang)}
        <li>
          <a href="/p/{project.data.slug}/{language.lang}" class="flex items-center gap-4 rounded-2xl px-3 py-3 -mx-3 transition-colors hover:bg-well">
            <div class="min-w-0 flex-1">
              <p class="truncate text-[17px] font-medium">{nativeName(language.lang)}</p>
              <p class="truncate text-sm text-ink-muted">{englishName(language.lang)}</p>
            </div>
            <div class="w-32 shrink-0">
              <ProgressBar progress={language} total={project.data.strings} />
              <p class="mt-1.5 text-right text-sm text-ink-muted tabular">{donePercent(language, project.data.strings)}%</p>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="placeholder h-40"></div>
  {/if}
</main>

<Footer />
