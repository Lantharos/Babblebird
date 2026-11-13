<script lang="ts">
  import KeyRound from "@lucide/svelte/icons/key-round"
  import LogOut from "@lucide/svelte/icons/log-out"
  import Languages from "#lib/account/Languages.svelte"
  import { auth, linkGitHub } from "#lib/api/auth.ts"
  import { getSession } from "#lib/api/session.svelte.ts"
  import Header from "#lib/layout/Header.svelte"
  import SchemeSwitch from "#lib/theme/SchemeSwitch.svelte"
  import GitHubMark from "#lib/ui/GitHubMark.svelte"
  import ConfirmDialog from "#lib/ui/overlay/ConfirmDialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import { goto } from "$app/navigation"

  const session = getSession()

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
    if (result.error) throw new Error(result.error.message ?? "That didn't work")
    location.href = "/"
  }

  async function signOut() {
    await auth.signOut()
    location.href = "/"
  }
</script>

<svelte:head><title>Settings · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page max-w-2xl pt-10 pb-24">
  <h1 class="title">Settings</h1>
  {#if session.me}
    <form class="mt-8 space-y-2" onsubmit={rename}>
      <label for="name" class="text-body font-medium">Your name</label>
      <p class="text-sm text-ink-muted">Shown next to your translations and in the commits that carry them.</p>
      <div class="flex gap-2">
        <input id="name" bind:value={name} required maxlength="80" class="field" />
        <button class="button button-quiet" disabled={!name.trim() || name === session.me.name}>Save</button>
      </div>
    </form>
    <Languages />
    <section class="mt-10 space-y-3">
      <h2 class="text-[20px] font-semibold">Signing in</h2>
      <p class="text-body text-ink-soft">You sign in as {session.me.email}{session.me.githubLogin ? ` and with GitHub as ${session.me.githubLogin}` : ""}.</p>
      <div class="flex flex-wrap gap-3">
        <button type="button" class="button button-quiet" onclick={addPasskey}><KeyRound class="size-4" />Add a passkey</button>
        {#if !session.me.githubLogin}
          <button type="button" class="button button-quiet" onclick={() => linkGitHub(`${location.origin}/settings`)}><GitHubMark class="size-4" />Link GitHub</button>
        {/if}
      </div>
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

<ConfirmDialog
  bind:open={deleting}
  title="Delete your account?"
  text="Your sign-ins and settings are deleted. Translations you made stay in their projects, credited to “A translator”."
  confirm="Delete"
  cancel="Keep it"
  onconfirm={deleteAccount}
/>
