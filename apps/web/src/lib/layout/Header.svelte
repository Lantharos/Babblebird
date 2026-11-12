<script lang="ts">
  import { onMount } from "svelte"
  import { session } from "#lib/api/session.svelte.ts"
  import Wordmark from "#lib/Wordmark.svelte"
  import { page } from "$app/state"

  let { wide = false }: { wide?: boolean } = $props()
  onMount(() => void session.load())
  const signIn = $derived(`/sign-in?next=${encodeURIComponent(page.url.pathname + page.url.search)}`)
</script>

<header class="sticky top-0 z-30 bg-glass backdrop-blur-xl">
  <div class="{wide ? 'px-4 sm:px-6' : 'page'} flex h-16 items-center gap-6">
    <a href="/" class="py-2"><Wordmark class="text-[23px]" /></a>
    <nav class="ml-auto flex items-center gap-1 text-[15px]">
      <a href="/projects" class="hidden rounded-full px-3 py-1.5 whitespace-nowrap text-ink-soft transition-colors hover:text-ink sm:block">Help translate</a>
      {#if session.me}
        <a href="/dashboard" class="rounded-full px-3 py-1.5 whitespace-nowrap text-ink-soft transition-colors hover:text-ink">Your projects</a>
        <a href="/settings" class="ml-2 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-well" aria-label="Your settings">
          {#if session.me.image}
            <img src={session.me.image} alt="" class="size-7 rounded-full" />
          {:else}
            <span class="grid size-7 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink">{(session.me.name || session.me.email).slice(0, 1).toUpperCase()}</span>
          {/if}
          <span class="hidden max-w-32 truncate sm:block">{session.me.name || session.me.email.split("@")[0]}</span>
        </a>
      {:else if session.loaded}
        <a href={signIn} class="button button-sm button-ink ml-2">Sign in</a>
      {/if}
    </nav>
  </div>
</header>
