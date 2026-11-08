<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import { onMount } from "svelte"
  import { api } from "../api/client.ts"
  import { englishName, nativeName } from "../languages.ts"
  import { donePercent } from "../projects/progress.ts"

  const FEATURED = ["sq", "de", "hr", "fr", "it", "es", "nl", "pl"]
  let project = $state<Project | null>(null)

  onMount(() => {
    api.get<Project>("/projects/lantharos/luft").then(
      (found) => (project = found),
      () => {},
    )
  })

  const languages = $derived(
    project
      ? FEATURED.flatMap((lang) => {
          const language = project!.languages.find((candidate) => candidate.lang === lang)
          return language ? [{ lang, done: donePercent(language, project!.strings) }] : []
        })
      : [],
  )
</script>

<a href="/p/lantharos/luft/status" class="block rounded-[32px] bg-raised p-8 ring-1 ring-hairline transition-shadow hover:ring-ink-muted/40 sm:p-10">
  <p class="text-[22px] font-semibold">Luft</p>
  <p class="text-[15px] text-ink-muted">{project ? `${project.strings.toLocaleString()} strings in ${project.languages.length} languages` : "Loading"}</p>
  <ul class="mt-8 space-y-4">
    {#each languages as language (language.lang)}
      <li class="grid grid-cols-[8rem_minmax(0,1fr)_3rem] items-center gap-4 text-[15px]">
        <span class="truncate" title={englishName(language.lang)}>{nativeName(language.lang)}</span>
        <span class="h-2 overflow-hidden rounded-full bg-well"><span class="block h-full rounded-full bg-done" style:width="{language.done}%"></span></span>
        <span class="text-right text-ink-muted tabular">{language.done}%</span>
      </li>
    {:else}
      {#each FEATURED as _}<li class="placeholder h-5"></li>{/each}
    {/each}
  </ul>
</a>
