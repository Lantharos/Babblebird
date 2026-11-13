<script lang="ts">
  import { api } from "#lib/api/client.ts"
  import { type Emails, getSession } from "#lib/api/session.svelte.ts"
  import Chip from "#lib/ui/fields/Chip.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  const session = getSession()
  const emails = $derived(session.me!.emails)

  const kinds: { key: keyof Emails; label: string }[] = [
    { key: "replies", label: "Replies to my comments" },
    { key: "strings", label: "New strings in my languages" },
    { key: "announcements", label: "Messages from maintainers" },
  ]

  async function toggle(key: keyof Emails) {
    await api.put("/me/emails", { ...emails, [key]: !emails[key] }).catch(toasts.error)
    await session.reload()
  }
</script>

<section class="mt-10 space-y-3">
  <h2 class="text-[20px] font-semibold">Emails</h2>
  <div class="flex flex-wrap gap-2">
    {#each kinds as kind (kind.key)}
      <Chip pressed={emails[kind.key]} onclick={() => toggle(kind.key)}>{kind.label}</Chip>
    {/each}
  </div>
</section>
