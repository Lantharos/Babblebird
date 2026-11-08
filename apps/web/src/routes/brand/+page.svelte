<script lang="ts">
  import BadgeMaker from "#lib/brand/BadgeMaker.svelte"
  import { COLOURS, file, SCHEMES } from "#lib/brand/brand.ts"
  import Showcase from "#lib/brand/Showcase.svelte"
  import Swatch from "#lib/brand/Swatch.svelte"
  import Usage from "#lib/brand/Usage.svelte"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"

  const svgAndPng = (name: string) => [
    { label: "SVG", href: file(`${name}.svg`) },
    { label: "PNG", href: file(`${name}.png`) },
  ]
</script>

<svelte:head>
  <title>Brand · Babblebird</title>
  <meta name="description" content="Babblebird’s logo, colours and README badges, ready to download." />
</svelte:head>

<Header />

<main class="page pt-16 pb-12">
  <h1 class="text-[44px] font-semibold tracking-[-0.03em]">Brand</h1>
  <p class="mt-3 max-w-2xl text-[18px] leading-relaxed text-ink-soft">
    Our logo, colours and badges, for writing about Babblebird or telling people your project can be translated here.
  </p>

  <section class="mt-20">
    <h2 class="text-[28px] font-semibold tracking-[-0.02em]">App icon</h2>
    <p class="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
      The full icon is for 64 pixels and up. Smaller than that, use the small one: its beak is the same colour as the bird and its eye is bigger, so it still reads as a bird in a browser tab.
    </p>
    <div class="mt-8 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Showcase
        caption="64 pixels and up"
        class="h-64"
        files={[
          { label: "SVG", href: file("icon.svg") },
          ...[1024, 512, 256, 128].map((size) => ({ label: `${size} PNG`, href: file(`icon-${size}.png`) })),
        ]}
      >
        <img src={file("icon.svg")} alt="Babblebird app icon" class="size-36" />
      </Showcase>
      <Showcase
        caption="Below 64 pixels"
        class="h-64 content-center gap-8"
        files={[
          { label: "SVG", href: file("icon-small.svg") },
          { label: "32 PNG", href: file("icon-small-32.png") },
        ]}
      >
        <img src={file("icon-small.svg")} alt="Small Babblebird app icon" class="size-8" />
        <div class="flex w-full max-w-60 items-center gap-2 rounded-xl bg-raised px-3 py-2.5 text-[13px] shadow-float" aria-hidden="true">
          <img src={file("icon-small.svg")} alt="" class="size-4" />
          <span class="truncate">Babblebird · Undoing Babel</span>
        </div>
      </Showcase>
    </div>
  </section>

  <section class="mt-24">
    <h2 class="text-[28px] font-semibold tracking-[-0.02em]">Wordmark</h2>
    <p class="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">The bird sits on the i. The letters are outlines, so it looks the same everywhere without the font.</p>
    <div class="mt-8 grid gap-8 md:grid-cols-2">
      {#each SCHEMES as { scheme, label }}
        <Showcase {scheme} caption={label} files={svgAndPng(`wordmark-${scheme}`)}>
          <img src={file(`wordmark-${scheme}.svg`)} alt="Babblebird" class="h-14 max-w-full" />
        </Showcase>
      {/each}
    </div>
  </section>

  <section class="mt-24">
    <h2 class="text-[28px] font-semibold tracking-[-0.02em]">Bird</h2>
    <p class="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">For when the name is already nearby. Its eye is cut out, so whatever is behind it shows through.</p>
    <div class="mt-8 grid gap-8 md:grid-cols-2">
      {#each SCHEMES as { scheme, label }}
        <Showcase {scheme} caption={label} files={svgAndPng(`bird-${scheme}`)}>
          <img src={file(`bird-${scheme}.svg`)} alt="Babblebird bird" class="h-24" />
        </Showcase>
      {/each}
    </div>
  </section>

  <section class="mt-24">
    <h2 class="text-[28px] font-semibold tracking-[-0.02em]">Colours</h2>
    <p class="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">Click a value to copy it. Where there are two, the second is for dark backgrounds.</p>
    <div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {#each COLOURS as colour (colour.name)}
        <Swatch {colour} />
      {/each}
    </div>
  </section>

  <section class="mt-24">
    <h2 class="text-[28px] font-semibold tracking-[-0.02em]">Using them</h2>
    <p class="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
      Use them freely to write about Babblebird or link to it, just not in a way that suggests we made or vouch for your project.
    </p>
    <div class="mt-8"><Usage /></div>
  </section>

  <section class="mt-24" id="badges">
    <h2 class="text-[28px] font-semibold tracking-[-0.02em]">Badges for your README</h2>
    <p class="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
      Let readers know your project is translated here, or ask them to help. For how far each language has come, use your project’s <a href="/docs/badges" class="link">progress badge</a>.
    </p>
    <div class="mt-8"><BadgeMaker /></div>
  </section>

  <section class="mt-24">
    <h2 class="text-[28px] font-semibold tracking-[-0.02em]">Mascot</h2>
    <p class="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">The round bird from our home page, for posts, slides and stickers.</p>
    <div class="mt-8 grid gap-8 md:grid-cols-2">
      {#each SCHEMES as { scheme, label }}
        <Showcase {scheme} caption={label} files={svgAndPng(`mascot-${scheme}`)} class="h-72">
          <img src={file(`mascot-${scheme}.svg`)} alt="Babblebird mascot" class="h-52" />
        </Showcase>
      {/each}
    </div>
  </section>
</main>

<Footer />
