<script lang="ts">
  import KeyRound from "@lucide/svelte/icons/key-round"
  import LogOut from "@lucide/svelte/icons/log-out"
  import Languages from "#lib/account/Languages.svelte"
  import { auth } from "#lib/api/auth.ts"
  import { session } from "#lib/api/session.svelte.ts"
  import Header from "#lib/layout/Header.svelte"
  import SchemeSwitch from "#lib/theme/SchemeSwitch.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import { goto } from "$app/navigation"

  let name = $state("")
  let deleting = $state(false)

  $effect(() => {
    if (session.loaded && !session.me) void goto("/sign-in?next=/settings")
    if (session.me) name = session.me.name
  })

  async function rename(event: SubmitEvent) {
    event.preventDefault()
    const result = await auth.updateUser({ name: name.trim() })
    if (result.error) return toasts.error(new Error(result.error.message ?? "That didn't work"))
    await session.reload()
    toasts.show("Saved")
  }

  async function addPasskey() {
    const result = await auth.passkey.addPasskey()
    if (result?.error) toasts.error(new Error(result.error.message ?? "That didn't work"))
    else toasts.show("Passkey added")
  }

  async function deleteAccount() {
    const result = await auth.deleteUser()
    if (result.error) return toasts.error(new Error(result.error.message ?? "That didn't work"))
    location.href = "/"
  }

  async function signOut() {
    await auth.signOut()
    location.href = "/"
  }
</script>

<svelte:head><title>Settings · Babblebird</title></svelte:head>

<Header />

<main class="page max-w-2xl pt-10">
  <h1 class="text-[34px] font-semibold tracking-[-0.025em]">Settings</h1>
  {#if session.me}
    <form class="mt-8 space-y-2" onsubmit={rename}>
      <label for="name" class="text-[15px] font-medium">Your name</label>
      <p class="text-sm text-ink-muted">Shown next to your translations and in the commits that carry them.</p>
      <div class="flex gap-2">
        <input id="name" bind:value={name} required maxlength="80" class="field" />
        <button class="button button-quiet" disabled={!name.trim() || name === session.me.name}>Save</button>
      </div>
    </form>
    <Languages />
    <section class="mt-10 space-y-3">
      <h2 class="text-[20px] font-semibold">Signing in</h2>
      <p class="text-[15px] text-ink-soft">You sign in as {session.me.email}{session.me.githubLogin ? ` and with GitHub as ${session.me.githubLogin}` : ""}.</p>
      <button type="button" class="button button-quiet" onclick={addPasskey}><KeyRound class="size-4" />Add a passkey</button>
    </section>
    <section class="mt-10 space-y-3">
      <h2 class="text-[20px] font-semibold">Appearance</h2>
      <SchemeSwitch />
    </section>
    <div class="mt-12 flex flex-wrap gap-3">
      <button type="button" class="button button-quiet" onclick={signOut}><LogOut class="size-4" />Sign out</button>
      <button type="button" class="button button-danger" onclick={() => (deleting = true)}>Delete account</button>
    </div>
  {/if}
</main>

<Dialog bind:open={deleting}>
  <div class="p-6">
    <h2 class="text-[20px] font-semibold">Delete your account?</h2>
    <p class="mt-2 text-[15px] leading-relaxed text-ink-soft">
      Your sign-ins and settings are deleted. Translations you made stay in their projects, credited to “A translator”.
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="button button-quiet" data-dismiss onclick={() => (deleting = false)}>Keep it</button>
      <button type="button" class="button button-danger" onclick={deleteAccount}>Delete</button>
    </div>
  </div>
</Dialog>
