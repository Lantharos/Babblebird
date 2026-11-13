<script lang="ts">
  import type { Progress } from "@babblebird/protocol"

  let {
    progress = null,
    total = 0,
    value,
    tone = "done",
    size = "sm",
    active = false,
    class: className = "",
  }: {
    progress?: Progress | null
    total?: number
    value?: number
    tone?: "done" | "accent"
    size?: "sm" | "md" | "lg"
    active?: boolean
    class?: string
  } = $props()

  const HEIGHTS = { sm: "h-1.5", md: "h-2", lg: "h-2.5" }
  const share = (part: number) => (total ? (part / total) * 100 : 0)
  const segments = $derived(
    value === undefined
      ? [
          { width: progress ? share(progress.translated - progress.review) : 0, colour: "bg-done" },
          { width: progress ? share(progress.review) : 0, colour: "bg-caution" },
        ]
      : [{ width: value, colour: `rounded-full ${tone === "done" ? "bg-done" : "bg-accent"}` }],
  )
</script>

<div class="flex overflow-hidden rounded-full bg-well {HEIGHTS[size]} {className}" aria-hidden="true">
  {#each segments as segment}
    <span class="h-full transition-[width] duration-500 {segment.colour}" class:active style:width="{segment.width}%"></span>
  {/each}
</div>

<style>
  @media (prefers-reduced-motion: no-preference) {
    .active {
      animation: breathe 1.6s ease-in-out infinite;
    }
  }

  @keyframes breathe {
    50% {
      opacity: 0.6;
    }
  }
</style>
