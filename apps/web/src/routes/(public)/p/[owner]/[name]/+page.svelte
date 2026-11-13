<script lang="ts">
  import { getSession } from "#lib/api/session.svelte.ts"
  import { englishName, nativeName } from "#lib/format/languages.ts"
  import Header from "#lib/layout/Header.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import ProjectHeader from "#lib/projects/ProjectHeader.svelte"
  import { donePercent } from "#lib/projects/progress.ts"

  let { data } = $props()

  const session = getSession()
  const project = $derived(data.project)
  const languages = $derived(
    project.languages.toSorted((a, b) =>
      a.lang === session.language
        ? -1
        : b.lang === session.language
          ? 1
          : nativeName(a.lang).localeCompare(nativeName(b.lang)),
    ),
  )
</script>

<svelte:head>
  <title>{project.name} · Babblebird</title>
  <meta name="description" content={project.description ?? `Help translate ${project.name} by ${project.owner} into ${project.languages.length} languages.`} />
</svelte:head>

<Header />

<main id="main" class="page pt-10 pb-24">
  <ProjectHeader {project} />
  <ul class="mt-8 grid gap-x-10 sm:grid-cols-2">
    {#each languages as language (language.lang)}
      <li>
        <a href="/p/{project.slug}/{language.lang}" class="-mx-3 flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-well">
          <div class="min-w-0 flex-1">
            <p class="truncate text-[17px] font-medium">{nativeName(language.lang)}</p>
            <p class="truncate text-sm text-ink-muted">{englishName(language.lang)}</p>
          </div>
          <div class="w-32 shrink-0">
            <ProgressBar progress={language} total={project.strings} />
            <p class="mt-1.5 text-right text-sm text-ink-muted tabular">{donePercent(language, project.strings)}%</p>
          </div>
        </a>
      </li>
    {/each}
  </ul>
</main>
