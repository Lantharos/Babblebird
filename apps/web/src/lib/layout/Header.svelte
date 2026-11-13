<script lang="ts">
  import { onMount } from "svelte"
  import { session } from "#lib/api/session.svelte.ts"
  import Avatar from "#lib/ui/Avatar.svelte"
  import Wordmark from "#lib/Wordmark.svelte"
  import { page } from "$app/state"

  onMount(() => void session.load())
  const signIn = $derived(`/sign-in?next=${encodeURIComponent(page.url.pathname + page.url.search)}`)
</script>

<a href="#main" class="skip">Skip to content</a>
<header class="sticky top-0 z-30 bg-glass backdrop-blur-xl">
  <div class="page flex h-16 items-center gap-6">
    <a href="/" class="py-2"><Wordmark class="text-[23px]" /></a>
    <nav class="ml-auto flex items-center gap-1">
      <a href="/projects" class="button button-sm button-ghost hidden sm:inline-flex">Help translate</a>
      {#if session.me}
        <a href="/dashboard" class="button button-sm button-ghost">Your projects</a>
        <a href="/settings" class="button button-sm button-ghost ml-2 pl-1" aria-label="Your settings">
          <Avatar name={session.me.name || session.me.email} image={session.me.image} tone="accent" />
          <span class="hidden max-w-32 truncate sm:block">{session.me.name || session.me.email.split("@")[0]}</span>
        </a>
      {:else}
        <a href={session.loaded ? signIn : undefined} class="button button-sm button-ink ml-2 {session.loaded ? '' : 'invisible'}">Sign in</a>
      {/if}
    </nav>
  </div>
</header>
