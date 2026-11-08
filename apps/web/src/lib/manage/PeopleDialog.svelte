<script lang="ts">
  import type { AreaSummary, Member, Project, Role } from "@babblebird/protocol"
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import Plus from "@lucide/svelte/icons/plus"
  import X from "@lucide/svelte/icons/x"
  import { api } from "#lib/api/client.ts"
  import type { Resource } from "#lib/api/resource.svelte.ts"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { nativeName } from "#lib/languages.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import { type Invitation, type People, roleName, roles } from "./people.svelte.ts"

  let {
    project,
    people,
    open = $bindable(false),
  }: { project: Project; people: Resource<People>; open?: boolean } = $props()

  const base = $derived(projectPath(project.owner, project.name))
  const areas = $derived(open ? resource<AreaSummary[]>(`${base}/areas`) : null)
  let adding = $state(false)
  let who = $state("")
  let role = $state<Role>("translator")
  let languages = $state<string[]>([])
  let areaSlugs = $state<string[]>([])

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
  }

  async function remove(member: Member) {
    await api.delete(`${base}/members/${member.userId}`).catch(toasts.error)
    await people.refresh()
  }

  async function uninvite(invite: Invitation) {
    await api.delete(`${base}/invitations/${encodeURIComponent(invite.who)}`).catch(toasts.error)
    await people.refresh()
  }
</script>

<Dialog bind:open class="max-w-xl" onclose={() => (adding = false)}>
  <div class="max-h-[80vh] overflow-y-auto p-6 sm:p-7">
    {#if adding}
      <button type="button" class="inline-flex items-center gap-1.5 text-[14px] text-ink-muted hover:text-ink" onclick={() => (adding = false)}><ArrowLeft class="size-4" />People</button>
      <form class="mt-4 space-y-6" onsubmit={add}>
        <h2 class="text-[20px] font-semibold">Add someone</h2>
        <label class="block space-y-1.5">
          <span class="text-[15px] font-medium">GitHub name or email</span>
          <input bind:value={who} required class="field" placeholder="octocat" />
          <span class="block text-[13px] text-ink-muted">If they haven’t signed in to Babblebird yet, they join when they do.</span>
        </label>
        <div class="space-y-2">
          <p class="text-[15px] font-medium">Role</p>
          <Segmented bind:value={role} options={roles} label="Role" />
        </div>
        {#if role !== "admin"}
          <div class="space-y-2">
            <p class="text-[15px] font-medium">Languages</p>
            <p class="text-[13px] text-ink-muted">None picked means every language.</p>
            <div class="flex flex-wrap gap-1.5">
              {#each project.languages as { lang } (lang)}
                <button type="button" aria-pressed={languages.includes(lang)} onclick={() => (languages = toggle(languages, lang))} class="rounded-full px-3 py-1 text-[13px] transition-colors {languages.includes(lang) ? 'bg-accent text-accent-ink' : 'bg-well hover:bg-[color-mix(in_oklab,var(--ink)_12%,transparent)]'}">{nativeName(lang)}</button>
              {/each}
            </div>
          </div>
          <div class="space-y-2">
            <p class="text-[15px] font-medium">Areas</p>
            <p class="text-[13px] text-ink-muted">None picked means every area.</p>
            <div class="flex flex-wrap gap-1.5">
              {#each areas?.data ?? [] as area (area.slug)}
                <button type="button" aria-pressed={areaSlugs.includes(area.slug)} onclick={() => (areaSlugs = toggle(areaSlugs, area.slug))} class="rounded-full px-3 py-1 text-[13px] transition-colors {areaSlugs.includes(area.slug) ? 'bg-accent text-accent-ink' : 'bg-well hover:bg-[color-mix(in_oklab,var(--ink)_12%,transparent)]'}">{area.name}</button>
              {/each}
            </div>
          </div>
        {/if}
        <div class="flex justify-end gap-2">
          <button type="button" class="button button-quiet" onclick={() => (adding = false)}>Cancel</button>
          <button class="button button-primary" disabled={!who.trim()}>Add</button>
        </div>
      </form>
    {:else}
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-[20px] font-semibold">People</h2>
        <button type="button" class="button button-sm button-quiet" onclick={() => (adding = true)}><Plus class="size-4" />Add someone</button>
      </div>
      <ul class="mt-5 divide-y divide-hairline">
        {#each people.data?.members ?? [] as member (member.userId)}
          <li class="flex items-center gap-3 py-3">
            {#if member.image}<img src={member.image} alt="" class="size-9 rounded-full" />{:else}<span class="grid size-9 place-items-center rounded-full bg-well text-sm font-semibold">{(member.name || member.githubLogin || "?").slice(0, 1)}</span>{/if}
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-medium">{member.name || member.githubLogin}</p>
              <p class="truncate text-[13px] text-ink-muted">{describe(member)}{member.fromGithub ? " · can push to the repository" : ""}</p>
            </div>
            {#if !member.fromGithub}
              <button type="button" class="grid size-8 place-items-center rounded-full hover:bg-well" aria-label="Remove {member.name}" onclick={() => remove(member)}><X class="size-4" /></button>
            {/if}
          </li>
        {/each}
        {#each people.data?.invitations ?? [] as invite (invite.who)}
          <li class="flex items-center gap-3 py-3">
            <span class="grid size-9 place-items-center rounded-full bg-well text-sm font-semibold text-ink-muted">{invite.who.slice(0, 1).toUpperCase()}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-medium">{invite.who}</p>
              <p class="truncate text-[13px] text-ink-muted">Invited · {describe(invite)}</p>
            </div>
            <button type="button" class="grid size-8 place-items-center rounded-full hover:bg-well" aria-label="Cancel the invitation for {invite.who}" onclick={() => uninvite(invite)}><X class="size-4" /></button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Dialog>
