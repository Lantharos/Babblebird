<script lang="ts">
  import { INSTALL_URL } from "@babblebird/protocol"
  import ArrowRight from "@lucide/svelte/icons/arrow-right"
  import Bubble from "#lib/landing/Bubble.svelte"
  import Diff from "#lib/landing/Diff.svelte"
  import Journey from "#lib/landing/Journey.svelte"
  import LiveProgress from "#lib/landing/LiveProgress.svelte"
  import Placeable from "#lib/landing/Placeable.svelte"
  import Plurals from "#lib/landing/Plurals.svelte"
  import Puff from "#lib/landing/Puff.svelte"
  import Said from "#lib/landing/Said.svelte"
  import Thanks from "#lib/landing/Thanks.svelte"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import GitHubMark from "#lib/ui/GitHubMark.svelte"
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

  <section class="page relative hidden h-[42rem] lg:block">
    <Bubble class="enter absolute top-10 left-[19rem] w-[23rem]">
      I read the Fluent files in your GitHub repository and send the translations back as commits. That’s the whole setup.
    </Bubble>
    <Bubble class="enter absolute top-[13rem] right-8 w-[21rem]" --order="1">
      Translators get a field for every plural form, with <Placeable text="$count" /> kept where it belongs and the screen it shows on.
    </Bubble>
    <Bubble href={INSTALL_URL} tone="accent" class="enter absolute top-[29rem] right-8 w-fit font-semibold" --order="2">
      Add me to a repository →
    </Bubble>
    <Bubble href="/p/lantharos/luft" class="enter absolute top-[34.5rem] right-8 w-fit hover:ring-ink-muted/40" --order="3">
      Luft is here already: 5,140 strings in 36 languages →
    </Bubble>
    <Puff class="absolute top-[13rem] left-0" />
  </section>

  <section class="page space-y-6 pt-6 pb-10 lg:hidden">
    <div class="h-52 w-full"><Puff class="origin-top-left scale-50" /></div>
    <Bubble>I read the Fluent files in your GitHub repository and send the translations back as commits. That’s the whole setup.</Bubble>
    <Bubble>Translators get a field for every plural form, with <Placeable text="$count" /> kept where it belongs and the screen it shows on.</Bubble>
    <Bubble href={INSTALL_URL} tone="accent" class="w-fit font-semibold">Add me to a repository →</Bubble>
    <Bubble href="/p/lantharos/luft" class="w-fit">Luft is here already: 5,140 strings in 36 languages →</Bubble>
  </section>

  <div class="page space-y-28 py-20 sm:space-y-36 sm:py-28">
    <section class="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
      <Said>Translating into Croatian? You get the three forms Croatian has, not the two English needs, and a preview with real numbers.</Said>
      <Plurals />
    </section>

    <section class="grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
      <div class="lg:order-2"><Said side="right">Maintainers see how far each language has come and what’s still missing. This is Luft, right now.</Said></div>
      <LiveProgress />
    </section>

    <section class="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
      <Said>Your repository only gets the lines that changed, in a commit that credits everyone who wrote them.</Said>
      <Diff />
    </section>
  </div>

  <section class="page pt-8 pb-8 sm:pt-16">
    <h2 class="mx-auto max-w-2xl text-center text-[34px] leading-tight font-semibold tracking-[-0.03em] sm:text-[44px]">
      How a string gets around
    </h2>
    <div class="mt-16"><Journey /></div>
  </section>

  <section class="page mt-28 mb-8 sm:mt-36">
    <div class="grid items-center gap-12 rounded-[40px] bg-well px-8 py-14 sm:px-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div class="max-w-xl">
        <h2 class="text-[36px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[52px]">Let everyone use what you made</h2>
        <p class="mt-5 text-[18px] leading-relaxed text-ink-soft">
          Add Babblebird to a repository and the people who speak your users’ languages can start today. Their work comes back to you as commits, with their names on it.
        </p>
        <div class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a href={INSTALL_URL} class="button button-lg button-ink"><GitHubMark class="size-5" />Add to a repository</a>
          <a href="/projects" class="group inline-flex items-center gap-1.5 text-[17px] font-medium text-ink-soft hover:text-ink">
            Or help translate<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
      <Thanks />
    </div>
  </section>
</main>

<Footer />
