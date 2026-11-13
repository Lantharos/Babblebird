<script lang="ts">
  import { api } from "#lib/api/client.ts"
  import { getSession } from "#lib/api/session.svelte.ts"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  type Mode = "name" | "other" | "none"

  const session = getSession()
  const credit = $derived(session.me!.credit)
  let mode = $state<Mode>("name")
  let other = $state("")

  $effect.pre(() => {
    mode = !credit.credited ? "none" : credit.name ? "other" : "name"
    other = credit.name ?? ""
  })

  async function store(credited: boolean, name: string | null) {
    await api.put("/me/credit", { credited, name }).catch(toasts.error)
    await session.reload()
    toasts.show("Saved")
  }

  function choose(next: Mode) {
    if (next !== "other") void store(next === "name", null)
  }

  function saveOther(event: SubmitEvent) {
    event.preventDefault()
    if (other.trim()) void store(true, other.trim())
  }
</script>

<section class="mt-10 space-y-3">
  <h2 class="text-[20px] font-semibold">Credit</h2>
  <p class="text-body text-ink-soft">The name on the commits that carry your translations.</p>
  <Segmented
    bind:value={mode}
    label="Credit"
    onchange={choose}
    options={[
      { value: "name", label: session.me!.name || "Your name" },
      { value: "other", label: "Another name" },
      { value: "none", label: "No credit" },
    ]}
  />
  {#if mode === "other"}
    <form class="flex gap-2" onsubmit={saveOther}>
      <input bind:value={other} required maxlength="80" class="field" aria-label="Name to credit" placeholder="Name to credit" />
      <button class="button button-quiet" disabled={!other.trim() || other.trim() === credit.name}>Save</button>
    </form>
  {/if}
</section>
