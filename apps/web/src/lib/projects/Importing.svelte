<script lang="ts">
  import type { ImportProgress } from "@babblebird/protocol"
  import { percent } from "#lib/format/languages.ts"
  import ProgressBar from "./ProgressBar.svelte"

  let { importing, class: className = "" }: { importing: ImportProgress; class?: string } = $props()
  const done = $derived(percent(Math.min(importing.done, importing.total), importing.total))
</script>

<div class={className}>
  <ProgressBar value={Math.max(done, 3)} tone="accent" active />
  <p class="mt-2 text-sm text-ink-muted tabular" role="status">Importing… {done}%</p>
</div>
