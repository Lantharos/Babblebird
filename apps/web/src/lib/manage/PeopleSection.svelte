<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import PeopleDialog from "./PeopleDialog.svelte"
  import { type People, roleName } from "./people.svelte.ts"
  import Section from "./Section.svelte"

  const SHOWN = 4

  let { project }: { project: Project } = $props()
  const people = $derived(resource<People>(`${projectPath(project.owner, project.name)}/members`))
  let open = $state(false)

  const members = $derived(people.data?.members ?? [])
  const invited = $derived(people.data?.invitations.length ?? 0)
</script>

<Section title="People" text="Anyone who can push to {project.name} manages it here. Add translators and reviewers for some languages or areas, or for all of them.">
  {#if people.data}
    <ul class="space-y-2">
      {#each members.slice(0, SHOWN) as member (member.userId)}
        <li class="flex items-center gap-3">
          {#if member.image}<img src={member.image} alt="" class="size-7 rounded-full" />{:else}<span class="grid size-7 place-items-center rounded-full bg-well text-[13px] font-semibold">{(member.name || member.githubLogin || "?").slice(0, 1)}</span>{/if}
          <span class="text-[15px]">{member.name || member.githubLogin}</span>
          <span class="text-[14px] text-ink-muted">{roleName(member.role)}</span>
        </li>
      {/each}
    </ul>
    {#if members.length > SHOWN || invited}
      <p class="mt-3 text-[14px] text-ink-muted">
        {[members.length > SHOWN ? `${members.length - SHOWN} more` : "", invited ? `${invited} invited` : ""].filter(Boolean).join(" · ")}
      </p>
    {/if}
  {:else}
    <div class="placeholder h-16"></div>
  {/if}
  <button type="button" class="button button-sm button-quiet mt-4" onclick={() => (open = true)}>Manage people</button>
</Section>

<PeopleDialog {project} {people} bind:open />
