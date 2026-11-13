<script lang="ts">
  import type { AreaSummary, Member, Project, Role } from "@babblebird/protocol"
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import LoaderCircle from "@lucide/svelte/icons/loader-circle"
  import Plus from "@lucide/svelte/icons/plus"
  import X from "@lucide/svelte/icons/x"
  import { api } from "#lib/api/client.ts"
  import { type Resource, resource } from "#lib/api/resource.svelte.ts"
  import { nativeName } from "#lib/format/languages.ts"
  import { type Invitation, type People, roleName, roles } from "#lib/manage/people.svelte.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Avatar from "#lib/ui/Avatar.svelte"
  import Chip from "#lib/ui/fields/Chip.svelte"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import ConfirmDialog from "#lib/ui/overlay/ConfirmDialog.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  interface Removal {
    title: string
    text: string
    confirm: string
    path: string
  }

  let {
    project,
    people,
    open = $bindable(false),
  }: { project: Project; people: Resource<People>; open?: boolean } = $props()

  const id = $props.id()
  const base = $derived(projectPath(project.owner, project.name))
  const areas = $derived(open ? resource<AreaSummary[]>(`${base}/areas`) : null)
  let adding = $state(false)
  let inviting = $state(false)
  let who = $state("")
  let role = $state<Role>("translator")
  let languages = $state<string[]>([])
  let areaSlugs = $state<string[]>([])
  let removal = $state<Removal>({ title: "", text: "", confirm: "", path: "" })
  let confirming = $state(false)

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((other) => other !== value) : [...list, value]
  const scope = (list: string[] | null, name: (value: string) => string) =>
    list?.length ? list.map(name).join(", ") : null

  function describe(entry: { role: Role; languages: string[] | null; areas: string[] | null }) {
    const parts = [roleName(entry.role)]
    const langs = scope(entry.languages, nativeName)
    if (langs) parts.push(langs)
    const named = scope(entry.areas, (slug) => areas?.data?.find((area) => area.slug === slug)?.name ?? slug)
    if (named) parts.push(named)
    return parts.join(" · ")
  }

  async function add(event: SubmitEvent) {
    event.preventDefault()
    inviting = true
    try {
      const scoped = role !== "admin"
      const result = await api.put<{ invited: boolean }>(`${base}/members`, {
        who,
        role,
        languages: scoped && languages.length ? languages : null,
        areas: scoped && areaSlugs.length ? areaSlugs : null,
      })
      toasts.show(result.invited ? `${who} is invited and joins when they sign in` : `${who} is added`)
      who = ""
      languages = []
      areaSlugs = []
      adding = false
      await people.refresh()
    } catch (error) {
      toasts.error(error)
    }
    inviting = false
  }

  function askToRemove(member: Member) {
    const name = member.name || member.githubLogin || "them"
    removal = {
      title: `Remove ${name}?`,
      text: `${name} can’t translate or review here anymore. What they already did stays.`,
      confirm: "Remove",
      path: `${base}/members/${member.userId}`,
    }
    confirming = true
  }

  function askToUninvite(invite: Invitation) {
    removal = {
      title: `Cancel the invitation for ${invite.who}?`,
      text: "They won’t join when they sign in.",
      confirm: "Cancel invitation",
      path: `${base}/invitations/${encodeURIComponent(invite.who)}`,
    }
    confirming = true
  }

  async function confirmRemoval() {
    await api.delete(removal.path)
    await people.refresh()
  }
</script>

{#snippet addActions()}
  <button type="button" class="button button-quiet" onclick={() => (adding = false)}>Cancel</button>
  <button form="{id}-add" class="button button-primary" disabled={inviting || !who.trim()}>
    {#if inviting}<LoaderCircle class="size-4 animate-spin" />{/if}
    Add
  </button>
{/snippet}

<Dialog bind:open class="max-w-xl" onclose={() => (adding = false)} actions={adding ? addActions : undefined}>
  {#if adding}
    <button type="button" class="inline-flex items-center gap-1.5 text-[14px] text-ink-muted hover:text-ink" onclick={() => (adding = false)}><ArrowLeft class="size-4" />People</button>
    <form id="{id}-add" class="mt-4 space-y-6" onsubmit={add}>
      <h2 class="text-[20px] font-semibold">Add someone</h2>
      <label class="block space-y-1.5">
        <span class="text-body font-medium">GitHub name or email</span>
        <input bind:value={who} required class="field" placeholder="octocat" />
        <span class="block text-small text-ink-muted">If they haven’t signed in to Babblebird yet, they join when they do.</span>
      </label>
      <div class="space-y-2">
        <p class="text-body font-medium">Role</p>
        <Segmented bind:value={role} options={roles} label="Role" />
      </div>
      {#if role !== "admin"}
        <div class="space-y-2">
          <p class="text-body font-medium">Languages</p>
          <p class="text-small text-ink-muted">None picked means every language.</p>
          <div class="flex flex-wrap gap-1.5">
            {#each project.languages as { lang } (lang)}
              <Chip pressed={languages.includes(lang)} onclick={() => (languages = toggle(languages, lang))}>{nativeName(lang)}</Chip>
            {/each}
          </div>
        </div>
        <div class="space-y-2">
          <p class="text-body font-medium">Areas</p>
          <p class="text-small text-ink-muted">None picked means every area.</p>
          <div class="flex flex-wrap gap-1.5">
            {#each areas?.data ?? [] as area (area.slug)}
              <Chip pressed={areaSlugs.includes(area.slug)} onclick={() => (areaSlugs = toggle(areaSlugs, area.slug))}>{area.name}</Chip>
            {/each}
          </div>
        </div>
      {/if}
    </form>
  {:else}
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-[20px] font-semibold">People</h2>
      <button type="button" class="button button-sm button-quiet" onclick={() => (adding = true)}><Plus class="size-4" />Add someone</button>
    </div>
    <ul class="mt-5 divide-y divide-hairline">
      {#each people.data?.members ?? [] as member (member.userId)}
        <li class="flex items-center gap-3 py-3">
          <Avatar name={member.name || member.githubLogin || ""} image={member.image} size="md" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-body font-medium">{member.name || member.githubLogin}</p>
            <p class="truncate text-small text-ink-muted">{describe(member)}{member.fromGithub ? " · can push to the repository" : ""}</p>
          </div>
          {#if !member.fromGithub}
            <button type="button" class="grid size-8 place-items-center rounded-full hover:bg-well" aria-label="Remove {member.name}" onclick={() => askToRemove(member)}><X class="size-4" /></button>
          {/if}
        </li>
      {/each}
      {#each people.data?.invitations ?? [] as invite (invite.who)}
        <li class="flex items-center gap-3 py-3">
          <Avatar name={invite.who} size="md" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-body font-medium">{invite.who}</p>
            <p class="truncate text-small text-ink-muted">Invited · {describe(invite)}</p>
          </div>
          <button type="button" class="grid size-8 place-items-center rounded-full hover:bg-well" aria-label="Cancel the invitation for {invite.who}" onclick={() => askToUninvite(invite)}><X class="size-4" /></button>
        </li>
      {/each}
    </ul>
  {/if}
</Dialog>

<ConfirmDialog bind:open={confirming} title={removal.title} text={removal.text} confirm={removal.confirm} cancel="Keep" onconfirm={confirmRemoval} />
