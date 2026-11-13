<script lang="ts">
  import type { DocPage } from "#lib/docs/pages.ts"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"

  let { page }: { page: DocPage } = $props()
</script>

<svelte:head><title>{page.title} · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page max-w-[44rem] pt-16 pb-24">
  <h1 class="text-[44px] font-semibold tracking-[-0.03em]">{page.title}</h1>
  <div class="prose mt-8">{@html page.html}</div>
</main>

<Footer />
