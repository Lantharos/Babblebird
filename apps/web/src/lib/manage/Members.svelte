<script lang="ts">
  import type { Member, Project, Role } from "@babblebird/protocol"
  import Plus from "@lucide/svelte/icons/plus"
  import X from "@lucide/svelte/icons/x"
  import { api } from "#lib/api/client.ts"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { nativeName } from "#lib/languages.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  let { project }: { project: Project } = $props()
  const base = $derived(`${projectPath(project.owner, project.name)}/members`)
  interface Invitation {
    who: string
    role: Role
    languages: string[] | null
  }

  const people = $derived(resource<{ members: Member[]; invitations: Invitation[] }>(base))

  let adding = $state(false)
  let who = $state("")
  let role = $state<Role>("translator")
  let languages = $state<string[]>([])

  const roles: { value: Role; label: string }[] = [
    { value: "translator", label: "Translator" },
    { value: "reviewer", label: "Reviewer" },
    { value: "admin", label: "Maintainer" },
  ]

  const toggle = (lang: string) =>
    (languages = languages.includes(lang)
      ? languages.filter((other) => other !== lang)
      : [...languages, lang])

  async function add(event: SubmitEvent) {
    event.preventDefault()
    try {
      await api.put(base, {
        who,
        role,
        languages: role === "admin" || !languages.length ? null : languages,
        areas: null,
      })
      adding = false
      who = ""
      languages = []
      await people.refresh()
    } catch (error) {
      toasts.error(error)
    }
  }

  async function uninvite(invite: Invitation) {
    await api
      .delete(`${projectPath(project.owner, project.name)}/invitations/${encodeURIComponent(invite.who)}`)
      .catch(toasts.error)
    await people.refresh()
  }

  async function remove(member: Member) {
    await api.delete(`${base}/${member.userId}`).catch(toasts.error)
    await people.refresh()
  }
</script>

<section>
  <div class="flex items-center justify-between gap-3">
    <h2 class="text-[22px] font-semibold tracking-[-0.02em]">People</h2>
    <button type="button" class="button button-sm button-quiet" onclick={() => (adding = true)}><Plus class="size-4" />Add</button>
  </div>
  <p class="mt-1 text-[15px] text-ink-soft">People with write access to the repository are maintainers here on their own.</p>
  <ul class="mt-4 space-y-1">
    {#each people.data?.members ?? [] as member (member.userId)}
      <li class="flex items-center gap-3 py-1.5">
        {#if member.image}<img src={member.image} alt="" class="size-8 rounded-full" />{:else}<span class="grid size-8 place-items-center rounded-full bg-well text-sm font-semibold">{member.name.slice(0, 1)}</span>{/if}
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-medium">{member.name || member.githubLogin}</p>
          <p class="truncate text-[13px] text-ink-muted">
            {roles.find((entry) => entry.value === member.role)?.label}{member.languages ? ` · ${member.languages.map(nativeName).join(", ")}` : ""}{member.fromGithub ? " · from GitHub" : ""}
          </p>
        </div>
        {#if !member.fromGithub}
          <button type="button" class="grid size-8 place-items-center rounded-full hover:bg-well" aria-label="Remove {member.name}" onclick={() => remove(member)}><X class="size-4" /></button>
        {/if}
      </li>
    {/each}
    {#each people.data?.invitations ?? [] as invite (invite.who)}
      <li class="flex items-center gap-3 py-1.5">
        <span class="grid size-8 place-items-center rounded-full bg-well text-sm font-semibold text-ink-muted">{invite.who.slice(0, 1).toUpperCase()}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-medium">{invite.who}</p>
          <p class="truncate text-[13px] text-ink-muted">Invited as {roles.find((entry) => entry.value === invite.role)?.label.toLowerCase()}, joins when they sign in</p>
        </div>
        <button type="button" class="grid size-8 place-items-center rounded-full hover:bg-well" aria-label="Cancel the invitation for {invite.who}" onclick={() => uninvite(invite)}><X class="size-4" /></button>
      </li>
    {/each}
  </ul>
</section>

<Dialog bind:open={adding} class="max-w-lg">
  <form class="space-y-5 p-6" onsubmit={add}>
    <h2 class="text-[20px] font-semibold">Add someone</h2>
    <label class="block space-y-1.5">
      <span class="text-[15px] font-medium">GitHub name or email</span>
      <input bind:value={who} required class="field" placeholder="octocat" />
      <span class="block text-[13px] text-ink-muted">If they haven’t signed in to Babblebird yet, they join when they do.</span>
    </label>
    <div class="space-y-1.5">
      <p class="text-[15px] font-medium">Role</p>
      <Segmented bind:value={role} options={roles} label="Role" />
    </div>
    {#if role !== "admin"}
      <div class="space-y-1.5">
        <p class="text-[15px] font-medium">Languages</p>
        <p class="text-[13px] text-ink-muted">Leave all off for every language.</p>
        <div class="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
          {#each project.languages as { lang } (lang)}
            <button type="button" aria-pressed={languages.includes(lang)} onclick={() => toggle(lang)} class="rounded-full px-3 py-1 text-[13px] transition-colors {languages.includes(lang) ? 'bg-accent text-accent-ink' : 'bg-well hover:bg-[color-mix(in_oklab,var(--ink)_12%,transparent)]'}">{nativeName(lang)}</button>
          {/each}
        </div>
      </div>
    {/if}
    <div class="flex justify-end gap-2">
      <button type="button" class="button button-quiet" data-dismiss onclick={() => (adding = false)}>Cancel</button>
      <button class="button button-primary" disabled={!who.trim()}>Add</button>
    </div>
  </form>
</Dialog>
