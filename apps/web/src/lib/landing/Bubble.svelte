<script lang="ts">
  import type { Snippet } from "svelte"

  let {
    href,
    tone = "raised",
    class: className = "",
    children,
  }: { href?: string; tone?: "raised" | "accent"; class?: string; children: Snippet } = $props()

  const colours = $derived(
    tone === "accent"
      ? "bg-accent text-accent-ink hover:bg-accent-hover"
      : "bg-raised text-ink ring-1 ring-hairline",
  )
</script>

<svelte:element
  this={href ? "a" : "div"}
  {href}
  class="bubble block rounded-bubble rounded-bl-[8px] px-6 py-5 text-[19px] leading-snug transition-colors {colours} {className}"
>
  {@render children()}
</svelte:element>
