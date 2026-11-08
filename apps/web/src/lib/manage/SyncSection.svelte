<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import History from "@lucide/svelte/icons/history"
  import { when } from "#lib/editor/time.ts"
  import Importing from "#lib/projects/Importing.svelte"
  import HistoryDialog from "./HistoryDialog.svelte"
  import Section from "./Section.svelte"

  let { project }: { project: Project } = $props()
  let open = $state(false)
</script>

<Section title="Syncing" text="Every push to {project.name}’s default branch that touches translations is read within a minute.">
  {#if project.importing}
    <a href="/p/{project.slug}/import" class="block max-w-sm"><Importing importing={project.importing} /></a>
  {:else if project.state === "failed"}
    <p class="text-[16px] text-danger">The last read didn’t work: {project.problem}. Babblebird tries again within ten minutes.</p>
  {:else}
    <p class="text-[16px]">Up to date{#if project.syncedAt}<span class="text-ink-soft"> · read {when(project.syncedAt)}</span>{/if}</p>
  {/if}
  <button type="button" class="button button-sm button-quiet mt-4" onclick={() => (open = true)}><History class="size-4" />Sync history</button>
</Section>

<HistoryDialog {project} bind:open />
