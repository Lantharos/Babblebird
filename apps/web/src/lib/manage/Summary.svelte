<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import { percent } from "#lib/format/languages.ts"
  import ProjectIcon from "#lib/projects/ProjectIcon.svelte"

  let { project }: { project: Project } = $props()

  const done = $derived(
    percent(
      project.languages.reduce((sum, language) => sum + language.translated - language.review, 0),
      project.strings * project.languages.length,
    ),
  )
  const review = $derived(project.languages.reduce((sum, language) => sum + language.review, 0))
</script>

<header class="flex flex-wrap items-center gap-x-6 gap-y-5">
  <ProjectIcon {project} class="size-16 rounded-2xl" />
  <div class="min-w-0 flex-1">
    <h1 class="title">{project.owner}/{project.name}</h1>
    <p class="mt-1 text-[16px] text-ink-soft">
      {done}% translated across {project.languages.length} languages · {project.strings.toLocaleString()} strings{#if review} · {review.toLocaleString()} to review{/if}
    </p>
  </div>
  <a href="/p/{project.slug}" class="button button-sm button-ink">Open as a translator</a>
</header>
