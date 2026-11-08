<script lang="ts">
  import type { Colour } from "./brand.ts"
  import { copy } from "./copy.ts"

  let { colour }: { colour: Colour } = $props()
  const hexes = $derived(colour.dark ? [colour.hex, colour.dark] : [colour.hex])
</script>

<div>
  <div class="relative flex h-24 overflow-hidden rounded-[22px]">
    {#each hexes as hex}
      <span class="flex-1" style:background={hex}></span>
    {/each}
    <span class="absolute inset-0 rounded-[22px] ring-1 ring-hairline ring-inset"></span>
  </div>
  <p class="mt-3 font-semibold">{colour.name}</p>
  <p class="text-[14px] text-ink-muted">{colour.use}</p>
  <div class="mt-1.5 flex flex-wrap gap-x-3">
    {#each hexes as hex, index}
      <button
        type="button"
        class="font-mono text-[13px] text-ink-soft transition-colors hover:text-ink"
        aria-label="Copy {hex}{colour.dark ? (index ? ' for dark backgrounds' : ' for light backgrounds') : ''}"
        onclick={() => copy(hex, `Copied ${hex}`)}
      >{hex}{#if index}<span class="ml-1 text-ink-muted">on dark</span>{/if}</button>
    {/each}
  </div>
</div>
