<script lang="ts">
  import { INSTALL_URL } from "@babblebird/protocol"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"

  const toml = `source = "en"
ignore = ["tools/fixtures/**"]

[[areas]]
name = "Website"
files = ["web/locales/{lang}/*.ftl"]`

  const workflow = `permissions:
  id-token: write
steps:
  - uses: actions/checkout@v6
  - run: ./capture-screenshots.sh
  - uses: Lantharos/Babblebird/action@main
    with:
      manifest: screenshots/manifest.json`

  const manifest = `{
  "screenshots": [{
    "file": "window-menu.png",
    "name": "Window menu",
    "strings": [
      { "key": "window-menu-close", "box": [612, 380, 180, 32] }
    ]
  }]
}`
</script>

<svelte:head><title>Docs · Babblebird</title></svelte:head>

<Header />

<main class="page max-w-3xl pt-16 pb-12">
  <h1 class="text-[44px] font-semibold tracking-[-0.03em]">Getting started</h1>
  <p class="mt-4 text-[19px] leading-relaxed text-ink-soft">
    Babblebird works with Fluent files on GitHub. There’s nothing to set up beyond installing the app.
  </p>

  <section class="mt-16 space-y-4 text-[17px] leading-relaxed text-ink-soft">
    <h2 class="text-[26px] font-semibold tracking-[-0.02em] text-ink">Add a repository</h2>
    <p>
      <a href={INSTALL_URL} class="link">Install the app</a> on the repositories you want translated. Babblebird looks for files at
      <code class="font-mono text-[15px] text-ink">**/locales/&lt;lang&gt;/*.ftl</code>, with English next to the other languages, and reads them within a minute.
    </p>
    <p>
      Apps with a <code class="font-mono text-[15px] text-ink">Sabine.toml</code> and extensions with an <code class="font-mono text-[15px] text-ink">extension.toml</code>
      become areas with their own name and icon. Other folders become one area per file. A glossary at
      <code class="font-mono text-[15px] text-ink">glossary/&lt;lang&gt;.tbx</code> is picked up too.
    </p>
  </section>

  <section class="mt-16 space-y-4 text-[17px] leading-relaxed text-ink-soft">
    <h2 class="text-[26px] font-semibold tracking-[-0.02em] text-ink">Change how it’s grouped</h2>
    <p>An optional <code class="font-mono text-[15px] text-ink">babblebird.toml</code> at the root names areas, groups files and skips folders:</p>
    <pre class="overflow-x-auto rounded-3xl bg-well px-6 py-5 font-mono text-[14px] leading-relaxed text-ink">{toml}</pre>
  </section>

  <section class="mt-16 space-y-4 text-[17px] leading-relaxed text-ink-soft">
    <h2 class="text-[26px] font-semibold tracking-[-0.02em] text-ink">Send screenshots</h2>
    <p>Your CI can show translators where each string appears. Add the action to a workflow that takes screenshots:</p>
    <pre class="overflow-x-auto rounded-3xl bg-well px-6 py-5 font-mono text-[14px] leading-relaxed text-ink">{workflow}</pre>
    <p>The manifest lists each image and the keys on it, with an optional box in pixels:</p>
    <pre class="overflow-x-auto rounded-3xl bg-well px-6 py-5 font-mono text-[14px] leading-relaxed text-ink">{manifest}</pre>
  </section>

  <section class="mt-16 space-y-4 text-[17px] leading-relaxed text-ink-soft">
    <h2 class="text-[26px] font-semibold tracking-[-0.02em] text-ink">Getting translations back</h2>
    <p>
      In a project’s status page, maintainers choose how translations come back: through a <code class="font-mono text-[15px] text-ink">babblebird/translations</code>
      branch that merges itself once the checks pass, straight onto the default branch, or not at all while another tool still owns the files.
      Only the messages that changed are touched, and everyone who translated them is credited in the commit.
    </p>
  </section>
</main>

<Footer />
