<script lang="ts">
  import type { Project, SyncEntry } from "@babblebird/protocol"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { when } from "#lib/format/time.ts"
  import { changesOf, titleOf } from "#lib/manage/history.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Loaded from "#lib/ui/Loaded.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"

  let { project, open = $bindable(false) }: { project: Project; open?: boolean } = $props()
  const history = $derived(
    open ? resource<SyncEntry[]>(`${projectPath(project.owner, project.name)}/history`) : null,
  )
</script>

<Dialog bind:open class="max-w-xl">
  <h2 class="text-[20px] font-semibold">Sync history</h2>
  <p class="mt-1 text-body text-ink-soft">Every sync of {project.name}, newest first.</p>
  <div class="mt-6">
    <Loaded data={history?.data} error={history?.error} retry={() => history?.refresh()} placeholder="h-32">
      {#snippet children(entries)}
        <ol class="space-y-5">
          {#each entries as entry (entry.id)}
            <li>
              <p class="text-[16px] font-medium">{titleOf(entry)}</p>
              <p class="mt-0.5 text-[14px] text-ink-soft">{changesOf(entry)}</p>
              <p class="mt-1 text-small text-ink-muted">
                <a href="https://github.com/{project.owner}/{project.name}/commit/{entry.sha}" class="font-mono hover:text-ink">{entry.sha.slice(0, 7)}</a>
                {#if entry.by}· {entry.by}{/if} · {when(entry.at)}
              </p>
            </li>
          {:else}
            <li class="text-body text-ink-soft">Nothing yet.</li>
          {/each}
        </ol>
      {/snippet}
    </Loaded>
  </div>
</Dialog>
