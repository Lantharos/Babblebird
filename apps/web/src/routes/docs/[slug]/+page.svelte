<script lang="ts">
  import DocsNav from "#lib/docs/DocsNav.svelte"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"

  let { data } = $props()
</script>

<svelte:head>
  <title>{data.page.title} · Babblebird docs</title>
</svelte:head>

<Header />

<main id="main" class="page grid gap-x-16 gap-y-10 pt-12 pb-20 lg:grid-cols-[14rem_minmax(0,1fr)]">
  <aside class="max-lg:order-2 lg:sticky lg:top-24 lg:self-start"><DocsNav nav={data.nav} current={data.page.slug} /></aside>
  <article class="min-w-0 max-w-[44rem]">
    <h1 class="text-[38px] leading-tight font-semibold tracking-[-0.03em]">{data.page.title}</h1>
    <div class="prose docs mt-8">{@html data.page.html}</div>
  </article>
</main>

<Footer />

<style>
  .docs :global(kbd) {
    display: inline-block;
    min-width: 1.5em;
    padding: 0 0.4em;
    border-radius: 6px;
    background: var(--well);
    font-family: var(--font-sans);
    font-size: 0.85em;
    line-height: 1.6;
    text-align: center;
    color: var(--ink);
  }
</style>
