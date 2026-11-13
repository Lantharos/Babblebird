<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import History from "@lucide/svelte/icons/history"
  import RefreshCw from "@lucide/svelte/icons/refresh-cw"
  import { api } from "#lib/api/client.ts"
  import { when } from "#lib/format/time.ts"
  import HistoryDialog from "#lib/manage/dialogs/HistoryDialog.svelte"
  import Importing from "#lib/projects/Importing.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import Section from "./Section.svelte"

  let { project, onchange }: { project: Project; onchange: () => Promise<unknown> } = $props()
  let open = $state(false)
  let syncing = $state<Pick<Project, "syncedAt" | "headSha" | "state"> | null>(null)

  async function sync() {
    try {
      syncing = { syncedAt: project.syncedAt, headSha: project.headSha, state: project.state }
      await api.post(`${projectPath(project.owner, project.name)}/sync`)
      toasts.show(`Syncing ${project.name}`)
    } catch (error) {
      syncing = null
      toasts.error(error)
    }
  }

  const settled = (before: NonNullable<typeof syncing>) =>
    project.syncedAt !== before.syncedAt ||
    project.headSha !== before.headSha ||
    project.state !== before.state

  $effect(() => {
    if (syncing && settled(syncing)) syncing = null
  })

  poll(
    () => onchange(),
    2000,
    () => syncing !== null,
  )
</script>

<Section title="Syncing" text="Pushes to the default branch that touch translations sync within a minute.">
  {#if project.importing}
    <a href="/p/{project.slug}/import" class="block max-w-sm"><Importing importing={project.importing} /></a>
  {:else if project.state === "failed"}
    <p class="text-[16px] text-danger">The last sync didn’t work: {project.problem}. Babblebird tries again within ten minutes.</p>
  {:else}
    <p class="text-[16px]">
      {project.syncedAt ? `Synced ${when(project.syncedAt)}` : "Not synced yet"}{#if project.headSha}<span class="text-ink-soft">, at
          <a href="https://github.com/{project.owner}/{project.name}/commit/{project.headSha}" class="font-mono text-[14px] hover:text-ink">{project.headSha.slice(0, 7)}</a></span>{/if}
    </p>
  {/if}
  <div class="mt-4 flex flex-wrap gap-2">
    <button type="button" class="button button-sm button-quiet" disabled={syncing !== null} onclick={sync}><RefreshCw class="size-4 {syncing ? 'animate-spin' : ''}" />Sync now</button>
    <button type="button" class="button button-sm button-quiet" onclick={() => (open = true)}><History class="size-4" />Sync history</button>
  </div>
</Section>

<HistoryDialog {project} bind:open />
