<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import { nativeName } from "#lib/format/languages.ts"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import { donePercent } from "#lib/projects/progress.ts"

  let { project }: { project: Project | undefined } = $props()

  const FEATURED = ["sq", "de", "hr", "fr", "it", "es", "nl", "pl"]

  const languages = $derived(
    project
      ? FEATURED.flatMap((lang) => {
          const language = project.languages.find((candidate) => candidate.lang === lang)
          return language ? [{ lang, done: donePercent(language, project.strings) }] : []
        })
      : [],
  )
</script>

<a href="/p/lantharos/luft/status" class="block rounded-stage bg-raised p-8 ring-1 ring-hairline transition-shadow hover:ring-ink-muted/40 sm:p-10">
  <p class="text-[22px] font-semibold">Luft</p>
  <p class="text-body text-ink-muted">{project ? `${project.strings.toLocaleString()} strings in ${project.languages.length} languages` : "Loading"}</p>
  <ul class="mt-8 space-y-4">
    {#each languages as language (language.lang)}
      <li class="grid grid-cols-[8rem_minmax(0,1fr)_3rem] items-center gap-4 text-body">
        <span class="truncate">{nativeName(language.lang)}</span>
        <ProgressBar value={language.done} size="md" />
        <span class="text-right text-ink-muted tabular">{language.done}%</span>
      </li>
    {:else}
      {#each FEATURED as _}<li class="placeholder h-5"></li>{/each}
    {/each}
  </ul>
</a>
