<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import RefreshCw from "@lucide/svelte/icons/refresh-cw"
  import { api } from "#lib/api/client.ts"
  import { when } from "#lib/editor/time.ts"
  import { percent } from "#lib/languages.ts"
  import ProjectIcon from "#lib/projects/ProjectIcon.svelte"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  let { project, onchange }: { project: Project; onchange: () => void } = $props()
  let syncing = $state(false)

  const done = $derived(
    percent(
      project.languages.reduce((sum, language) => sum + language.translated - language.review, 0),
      project.strings * project.languages.length,
    ),
  )
  const review = $derived(project.languages.reduce((sum, language) => sum + language.review, 0))

  async function sync() {
    syncing = true
    try {
      await api.post(`${projectPath(project.owner, project.name)}/sync`)
      toasts.show(`Reading ${project.name} again`)
      setTimeout(onchange, 4000)
    } catch (error) {
      toasts.error(error)
    }
    syncing = false
  }
</script>

<header class="flex flex-wrap items-start gap-x-6 gap-y-5">
  <ProjectIcon {project} class="size-16 rounded-2xl" />
  <div class="min-w-0 flex-1">
    <h1 class="text-[32px] leading-tight font-semibold tracking-[-0.025em]">{project.owner}/{project.name}</h1>
    <p class="mt-1 text-[16px] text-ink-soft">
      {done}% translated across {project.languages.length} languages · {project.strings.toLocaleString()} strings{#if review} · {review.toLocaleString()} to review{/if}
    </p>
    {#if project.state === "failed"}
      <p class="mt-1 text-[15px] text-danger">The last read didn’t work</p>
    {:else if project.importing}
      <p class="mt-1 text-[15px] text-ink-muted">Reading the repository for the first time</p>
    {:else if project.syncedAt}
      <p class="mt-1 text-[15px] text-ink-muted">In sync with GitHub · read {when(project.syncedAt)}</p>
    {/if}
  </div>
  <div class="flex flex-wrap gap-2">
    <button type="button" class="button button-sm button-quiet" disabled={syncing} onclick={sync}><RefreshCw class="size-4 {syncing ? 'animate-spin' : ''}" />Sync now</button>
    <a href="/p/{project.slug}" class="button button-sm button-ink">Open as a translator</a>
  </div>
</header>
