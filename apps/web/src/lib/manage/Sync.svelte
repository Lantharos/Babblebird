<script lang="ts">
  import { INSTALL_URL, type Project } from "@babblebird/protocol"
  import RefreshCw from "@lucide/svelte/icons/refresh-cw"
  import { api } from "#lib/api/client.ts"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { when } from "#lib/editor/time.ts"
  import Importing from "#lib/projects/Importing.svelte"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  interface Sync {
    id: number
    at: number
    sha: string
    files: number
    areas: number
  }

  let { project, onchange }: { project: Project; onchange: () => void } = $props()
  const base = $derived(projectPath(project.owner, project.name))
  const history = $derived(resource<Sync[]>(`${base}/history`))
  let syncing = $state(false)

  async function sync() {
    syncing = true
    try {
      await api.post(`${base}/sync`)
      toasts.show("Reading the repository again")
      setTimeout(() => {
        void history.refresh()
        onchange()
      }, 4000)
    } catch (error) {
      toasts.error(error)
    }
    syncing = false
  }
</script>

<section>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="text-[22px] font-semibold tracking-[-0.02em]">Syncing</h2>
    <button type="button" class="button button-sm button-quiet" disabled={syncing} onclick={sync}><RefreshCw class="size-4 {syncing ? 'animate-spin' : ''}" />Sync now</button>
  </div>
  {#if project.importing}
    <a href="/p/{project.slug}/import" class="mt-4 block max-w-md"><Importing importing={project.importing} /></a>
  {:else if project.state === "failed"}
    <p class="mt-3 text-[15px] text-danger">The last sync didn’t work: {project.problem}</p>
  {:else}
    <p class="mt-2 text-[15px] text-ink-soft">
      Every push to {project.slug.split("/")[1]}’s default branch that touches translations is read within a minute.
      {#if project.syncedAt}Last read {when(project.syncedAt)}.{/if}
    </p>
  {/if}
  {#if history.data?.length}
    <ol class="mt-5 divide-y divide-hairline text-[15px]">
      {#each history.data as entry (entry.id)}
        <li class="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
          <a href="https://github.com/{project.owner}/{project.name}/commit/{entry.sha}" class="font-mono text-[13px] text-ink-soft hover:text-ink">{entry.sha.slice(0, 9)}</a>
          <span class="text-ink-muted">{entry.files ? `${entry.files} changed files` : "Nothing changed"} · {when(entry.at)}</span>
        </li>
      {/each}
    </ol>
  {/if}
  <p class="mt-5 text-[13px] text-ink-muted">If Babblebird was removed from the repository on GitHub, <a href={INSTALL_URL} class="link">add it again</a> to reconnect.</p>
</section>
