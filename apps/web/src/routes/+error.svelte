<script lang="ts">
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import { page } from "$app/state"

  const missing = $derived(page.status === 404)
</script>

<svelte:head><title>{missing ? "Lost in translation" : "Something went wrong"} · Babblebird</title></svelte:head>

<Header />
<main class="page grid min-h-[60svh] place-items-center text-center">
  <div class="enter">
    <p class="text-[96px] leading-none font-semibold text-accent tabular">{page.status}</p>
    <h1 class="mt-4 text-[32px] font-semibold tracking-[-0.025em]">{missing ? "This page got lost in translation" : "Something went wrong"}</h1>
    <p class="mt-3 text-[17px] text-ink-soft">{missing ? "There’s nothing at this address, in any language." : page.error?.message}</p>
    <a href="/" class="button button-quiet mt-8">Back to the start</a>
  </div>
</main>
<Footer />
