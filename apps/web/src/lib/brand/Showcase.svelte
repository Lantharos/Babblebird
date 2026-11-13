<script lang="ts">
  import type { Snippet } from "svelte"
  import type { Scheme } from "./brand.ts"
  import Downloads from "./Downloads.svelte"

  let {
    scheme,
    caption,
    files,
    class: className = "h-56",
    children,
  }: {
    scheme?: Scheme
    caption: string
    files: { label: string; href: string }[]
    class?: string
    children: Snippet
  } = $props()
</script>

<div class="min-w-0">
  <div
    data-scheme={scheme}
    class="grid place-items-center rounded-panel px-8 {scheme ? 'bg-raised ring-1 ring-hairline' : 'bg-well'} {className}"
  >
    {@render children()}
  </div>
  <p class="mt-4 mb-3 text-body text-ink-soft">{caption}</p>
  <Downloads {files} />
</div>
