<script lang="ts">
  import { INSTALL_URL } from "@babblebird/protocol"
  import ArrowRight from "@lucide/svelte/icons/arrow-right"
  import Areas from "#lib/landing/Areas.svelte"
  import Commit from "#lib/landing/Commit.svelte"
  import EditorSketch from "#lib/landing/EditorSketch.svelte"
  import Mascot from "#lib/landing/Mascot.svelte"
  import Screen from "#lib/landing/Screen.svelte"
  import Story from "#lib/landing/Story.svelte"
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

<main>
  <section class="page flex items-center justify-between gap-16 pt-20 pb-28 sm:pt-32 sm:pb-36">
    <div class="enter max-w-2xl">
      <div class="-mt-8 mb-6 h-40 w-64 lg:hidden"><Mascot class="origin-top-left scale-[0.62]" /></div>
      <h1 class="text-[56px] leading-[0.98] font-semibold tracking-[-0.04em] sm:text-[84px]">Undoing Babel</h1>
      <p class="mt-8 max-w-xl text-[19px] leading-relaxed text-ink-soft sm:text-[21px]">
        Babblebird is where open source projects get translated. It reads your Fluent files straight from GitHub and sends the translations
        back as commits.
      </p>
      <div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
        <a href={INSTALL_URL} class="button button-lg button-ink"><GitHubMark class="size-5" />Add to a repository</a>
        <a href="/projects" class="group inline-flex items-center gap-1.5 text-[17px] font-medium text-ink-soft hover:text-ink">
          Help translate<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
    <div class="enter shrink-0 max-lg:hidden" style:--order="2"><Mascot /></div>
  </section>

  <section class="page">
    <div class="enter" style:--order="3"><EditorSketch /></div>
    <p class="mx-auto mt-8 max-w-xl text-center text-[17px] text-ink-muted">
      One field for every plural form your language has, placeables checked as you type, and a preview with real numbers.
    </p>
  </section>

  <div class="page mt-16">
    <Story
      title="Install it. That’s the setup."
      text="Babblebird finds every Fluent file in the repository and groups them the way the project is built: each app and extension becomes an area, with its own name and icon taken from the code."
    >
      <Areas />
    </Story>
    <Story
      flip
      title="Translate with the screen in view."
      text="A project’s CI sends screenshots along with the strings that were on screen, so translators see the menu or button they’re working on with the string marked."
    >
      <Screen />
    </Story>
    <Story
      title="Back in the repository."
      text="Translations go out in small batches that merge once the checks pass, crediting everyone who worked on them. When the English changes, its translations are marked for review on their own."
    >
      <Commit />
    </Story>
  </div>

  <section class="page py-28 text-center sm:py-36">
    <h2 class="mx-auto max-w-2xl text-[36px] leading-tight font-semibold tracking-[-0.03em] sm:text-[48px]">Free for open source projects</h2>
    <p class="mx-auto mt-5 max-w-lg text-[18px] text-ink-soft">Install the app on a public repository and its translators can start today.</p>
    <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
      <a href={INSTALL_URL} class="button button-lg button-ink"><GitHubMark class="size-5" />Add to a repository</a>
      <a href="/docs" class="button button-lg button-quiet">Read the docs</a>
    </div>
  </section>
</main>

<Footer />
