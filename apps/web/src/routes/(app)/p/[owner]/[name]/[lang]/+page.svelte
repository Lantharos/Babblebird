<script lang="ts">
  import type { AreaSummary } from "@babblebird/protocol"
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { session } from "#lib/api/session.svelte.ts"
  import { englishName, nativeName } from "#lib/format/languages.ts"
  import Header from "#lib/layout/Header.svelte"
  import AreaIcon from "#lib/projects/AreaIcon.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import { donePercent } from "#lib/projects/progress.ts"
  import { projectPath, projectResource } from "#lib/projects/project.svelte.ts"
  import Loaded from "#lib/ui/Loaded.svelte"
  import { page } from "$app/state"

  const owner = $derived(page.params.owner!)
  const name = $derived(page.params.name!)
  const lang = $derived(page.params.lang!)
  const project = $derived(projectResource(owner, name))
  const areas = $derived(resource<AreaSummary[]>(`${projectPath(owner, name)}/areas?lang=${lang}`))
  const overall = $derived(project.data?.languages.find((language) => language.lang === lang) ?? null)

  $effect(() => {
    if (session.loaded && lang !== session.language) session.browseIn(lang)
  })
</script>

<svelte:head><title>{nativeName(lang)} · {project.data?.name ?? "Project"} · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page pt-10 pb-24">
  <a href="/p/{owner.toLowerCase()}/{name.toLowerCase()}" class="inline-flex items-center gap-1.5 text-body text-ink-muted hover:text-ink">
    <ArrowLeft class="size-4" />{project.data?.name ?? name}
  </a>
  <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="title">{nativeName(lang)}</h1>
      <p class="text-body text-ink-muted">{englishName(lang)}</p>
    </div>
    {#if project.data && overall}
      <div class="w-56">
        <ProgressBar progress={overall} total={project.data.strings} />
        <p class="mt-2 text-sm text-ink-muted tabular">
          {donePercent(overall, project.data.strings)}% of {project.data.strings.toLocaleString()} strings
          {#if overall.review}· {overall.review} to review{/if}
        </p>
      </div>
    {/if}
  </div>

  <div class="mt-10">
    <Loaded data={areas.data} error={areas.error} retry={() => areas.refresh()}>
      {#snippet children(found)}
        <ul class="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {#each found as area, index (area.id)}
            {@const done = donePercent(area.progress, area.strings)}
            <li class="enter" style:--order={Math.min(index, 12)}>
              <a href="/p/{owner}/{name}/{lang}/{area.slug}" class="group block rounded-tile p-3 -m-3 transition-colors hover:bg-well">
                <AreaIcon name={area.name} icon={area.icon} class="size-14" />
                <p class="mt-3 truncate text-[17px] font-medium">{area.name}</p>
                <p class="text-sm text-ink-muted tabular">
                  {#if done === 100}All done{:else}{area.strings - (area.progress?.translated ?? 0) || "No"} missing{/if}
                  · {area.strings.toLocaleString()} strings
                </p>
                <ProgressBar class="mt-3" progress={area.progress} total={area.strings} />
              </a>
            </li>
          {/each}
        </ul>
      {/snippet}
    </Loaded>
  </div>
</main>
