<script lang="ts">
  import type { Progress } from "@babblebird/protocol"

  let {
    progress,
    total,
    class: className = "",
  }: { progress: Progress | null; total: number; class?: string } = $props()

  const done = $derived(progress && total ? ((progress.translated - progress.review) / total) * 100 : 0)
  const review = $derived(progress && total ? (progress.review / total) * 100 : 0)
</script>

<div class="flex h-1.5 overflow-hidden rounded-full bg-well {className}" aria-hidden="true">
  <span class="h-full bg-done transition-[width] duration-500" style:width="{done}%"></span>
  <span class="h-full bg-caution transition-[width] duration-500" style:width="{review}%"></span>
</div>
