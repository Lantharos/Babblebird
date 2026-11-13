<script lang="ts">
  import Copy from "@lucide/svelte/icons/copy"
  import { copy } from "#lib/ui/copy.ts"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import { BADGES, type BadgeKind, badgeUrl, SITE } from "./brand.ts"

  type Format = "markdown" | "html"
  type Look = "light" | "dark" | "auto"

  let kind = $state<BadgeKind>("translated")
  let look = $state<Look>("auto")
  let format = $state<Format>("html")
  let repository = $state("")

  const looks = $derived([
    { value: "light" as Look, label: "Light" },
    { value: "dark" as Look, label: "Dark" },
    ...(format === "html" ? [{ value: "auto" as Look, label: "Match the reader" }] : []),
  ])
  const alt = $derived(BADGES.find((badge) => badge.kind === kind)!.alt)
  const slug = $derived(
    repository
      .trim()
      .replace(/^https:\/\/github\.com\//, "")
      .replace(/\/+$/, ""),
  )
  const link = $derived(slug ? `${SITE}/p/${slug}` : SITE)
  const light = $derived(badgeUrl(kind, "light"))
  const dark = $derived(badgeUrl(kind, "dark"))

  const snippet = $derived.by(() => {
    const image = look === "dark" ? dark : light
    if (format === "markdown") return `[![${alt}](${image})](${link})`
    if (look !== "auto") return `<a href="${link}"><img src="${image}" alt="${alt}"></a>`
    return `<a href="${link}">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="${dark}">
    <img src="${light}" alt="${alt}">
  </picture>
</a>`
  })

  function chooseFormat(next: Format) {
    if (next === "markdown" && look === "auto") look = "light"
  }
</script>

<div class="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
  <div class="space-y-6">
    <div>
      <p class="mb-2 text-body font-medium">Badge</p>
      <Segmented bind:value={kind} label="Badge" options={BADGES.map((badge) => ({ value: badge.kind, label: badge.label }))} />
    </div>
    <div>
      <p class="mb-2 text-body font-medium">Colours</p>
      <Segmented bind:value={look} label="Colours" options={looks} />
    </div>
    <div>
      <p class="mb-2 text-body font-medium">Format</p>
      <Segmented
        bind:value={format}
        label="Format"
        onchange={chooseFormat}
        options={[
          { value: "html", label: "HTML" },
          { value: "markdown", label: "Markdown" },
        ]}
      />
    </div>
    <label class="block">
      <span class="mb-2 block text-body font-medium">Your repository</span>
      <input bind:value={repository} class="field font-mono text-[14px]" placeholder="owner/repo" spellcheck="false" autocomplete="off" />
      <span class="mt-2 block text-[14px] text-ink-muted">The badge links to your project’s page. Leave it empty to link to Babblebird.</span>
    </label>
  </div>

  <div class="min-w-0">
    <div class="grid h-32 grid-cols-2 overflow-hidden rounded-panel ring-1 ring-hairline">
      <div data-scheme="light" class="grid place-items-center bg-raised px-4">
        <img src={badgeUrl(kind, look === "dark" ? "dark" : "light")} alt={alt} class="h-6 max-w-full" />
      </div>
      <div data-scheme="dark" class="grid place-items-center bg-raised px-4">
        <img src={badgeUrl(kind, look === "light" ? "light" : "dark")} alt={alt} class="h-6 max-w-full" />
      </div>
    </div>
    <div class="mt-4 rounded-tile bg-well p-2">
      <pre class="overflow-x-auto px-3 pt-2 pb-3 font-mono text-small leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{snippet}</pre>
      <div class="flex justify-end">
        <button type="button" class="button button-sm button-ink" onclick={() => copy(snippet)}><Copy class="size-4" />Copy</button>
      </div>
    </div>
  </div>
</div>
