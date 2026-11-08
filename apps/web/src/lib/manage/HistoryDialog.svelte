<script lang="ts">
  import type { Project, SyncEntry } from "@babblebird/protocol"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { when } from "#lib/editor/time.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { changesOf, titleOf } from "./history.ts"

  let { project, open = $bindable(false) }: { project: Project; open?: boolean } = $props()
  const history = $derived(
    open ? resource<SyncEntry[]>(`${projectPath(project.owner, project.name)}/history`) : null,
  )
</script>

<Dialog bind:open class="max-w-xl">
  <div class="max-h-[75vh] overflow-y-auto p-6 sm:p-7">
    <h2 class="text-[20px] font-semibold">Sync history</h2>
    <p class="mt-1 text-[15px] text-ink-soft">Every time Babblebird read {project.name}, newest first.</p>
    {#if history?.data}
      <ol class="mt-6 space-y-5">
        {#each history.data as entry (entry.id)}
          <li>
            <p class="text-[16px] font-medium">{titleOf(entry)}</p>
            <p class="mt-0.5 text-[14px] text-ink-soft">{changesOf(entry)}</p>
            <p class="mt-1 text-[13px] text-ink-muted">
              <a href="https://github.com/{project.owner}/{project.name}/commit/{entry.sha}" class="font-mono hover:text-ink">{entry.sha.slice(0, 7)}</a>
              {#if entry.by}· {entry.by}{/if} · {when(entry.at)}
            </p>
          </li>
        {:else}
          <li class="text-[15px] text-ink-soft">Nothing yet.</li>
        {/each}
      </ol>
    {:else}
      <div class="placeholder mt-6 h-32"></div>
    {/if}
  </div>
</Dialog>
