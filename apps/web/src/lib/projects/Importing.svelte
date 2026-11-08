<script lang="ts">
  import type { ImportProgress } from "@babblebird/protocol"
  import { percent } from "../languages.ts"

  let { importing, class: className = "" }: { importing: ImportProgress; class?: string } = $props()
  const done = $derived(percent(Math.min(importing.done, importing.total), importing.total))
</script>

<div class={className}>
  <div class="h-1.5 overflow-hidden rounded-full bg-well" aria-hidden="true">
    <span class="importing block h-full rounded-full bg-accent transition-[width] duration-700" style:width="{Math.max(done, 3)}%"></span>
  </div>
  <p class="mt-2 text-sm text-ink-muted tabular" role="status">Importing… {done}%</p>
</div>

<style>
  @media (prefers-reduced-motion: no-preference) {
    .importing {
      animation: breathe 1.6s ease-in-out infinite;
    }
  }

  @keyframes breathe {
    50% {
      opacity: 0.6;
    }
  }
</style>
