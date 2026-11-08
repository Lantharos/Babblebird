<script lang="ts">
  import { INSTALL_URL } from "@babblebird/protocol"
  import Bubble from "#lib/landing/Bubble.svelte"
  import Journey from "#lib/landing/Journey.svelte"
  import Placeable from "#lib/landing/Placeable.svelte"
  import Puff from "#lib/landing/Puff.svelte"
  import Tiles from "#lib/landing/Tiles.svelte"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
</script>

<svelte:head>
  <title>Babblebird · Undoing Babel</title>
  <meta
    name="description"
    content="Translate open source projects right from their repository. Babblebird reads Fluent files from GitHub, shows translators where each string appears and sends translations back as commits."
  />
</svelte:head>

<Header />

<main class="overflow-x-clip">
  <h1 class="sr-only">Babblebird, translations that live in your repository</h1>

  <section class="page relative hidden h-[47rem] lg:block">
    <Bubble class="enter absolute top-10 left-[19rem] w-[23rem]">
      I read the Fluent files in your GitHub repository and send the translations back as commits. That’s the whole setup.
    </Bubble>
    <Bubble class="enter absolute top-24 right-8 w-[21rem]" --order="1">
      Translators get a field for every plural form, with <Placeable text="$count" /> kept where it belongs and the screen it shows on.
    </Bubble>
    <div class="enter absolute top-[20rem] right-8" style:--order="2"><Tiles /></div>
    <Bubble href="/p/lantharos/luft" class="enter absolute top-[40rem] left-[19rem] w-fit hover:ring-ink-muted/40" --order="3">
      Luft is here already: 5,140 strings in 36 languages →
    </Bubble>
    <Bubble href={INSTALL_URL} tone="accent" class="enter absolute top-[40rem] right-8 w-fit font-semibold" --order="4">
      Add me to a repository →
    </Bubble>
    <Puff class="absolute top-[13rem] left-0" />
  </section>

  <section class="page space-y-6 pt-6 pb-16 lg:hidden">
    <div class="h-52 w-full"><Puff class="origin-top-left scale-50" /></div>
    <Bubble>I read the Fluent files in your GitHub repository and send the translations back as commits. That’s the whole setup.</Bubble>
    <Bubble>Translators get a field for every plural form, with <Placeable text="$count" /> kept where it belongs and the screen it shows on.</Bubble>
    <div class="py-6"><Tiles /></div>
    <Bubble href={INSTALL_URL} tone="accent" class="w-fit font-semibold">Add me to a repository →</Bubble>
    <Bubble href="/p/lantharos/luft" class="w-fit">Luft is here already: 5,140 strings in 36 languages →</Bubble>
  </section>

  <section class="page pt-16 pb-8 sm:pt-24">
    <h2 class="mx-auto max-w-2xl text-center text-[34px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
      How a string gets around
    </h2>
    <div class="mt-16"><Journey /></div>
  </section>
</main>

<Footer />
