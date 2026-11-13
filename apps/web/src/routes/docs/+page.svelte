<script lang="ts">
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"

  let { data } = $props()

  const intros: Record<string, string> = {
    Translating: "Find a project, translate in your language and get your work reviewed.",
    "Maintaining a project":
      "Add a repository, shape its areas, choose how translations come back and who can make them.",
    "Running Babblebird": "Run it on your own machine or your own Cloudflare account.",
  }
</script>

<svelte:head>
  <title>Docs · Babblebird</title>
  <meta name="description" content="How to translate with Babblebird, add a repository and run it yourself." />
</svelte:head>

<Header />

<main id="main" class="page pt-16 pb-20">
  <h1 class="text-[44px] font-semibold tracking-[-0.03em]">Docs</h1>
  <div class="mt-14 grid gap-x-16 gap-y-14 md:grid-cols-3">
    {#each data.nav as section}
      <section>
        <h2 class="text-[22px] font-semibold tracking-[-0.02em]">{section.name}</h2>
        <p class="mt-2 text-[16px] leading-relaxed text-ink-soft">{intros[section.name]}</p>
        <ul class="mt-5 space-y-2 text-[16px]">
          {#each section.pages as page}
            <li><a href="/docs/{page.slug}" class="link">{page.title}</a></li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</main>

<Footer />
