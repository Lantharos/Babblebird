<script lang="ts">
  let {
    name,
    image = null,
    size = "sm",
    tone = "quiet",
  }: { name: string; image?: string | null; size?: "sm" | "md"; tone?: "quiet" | "accent" } = $props()

  const initial = $derived((name.trim()[0] ?? "?").toUpperCase())
  const box = $derived(size === "sm" ? "size-7 text-small" : "size-9 text-sm")
</script>

{#if image}
  <img src={image} alt="" class="{box} shrink-0 rounded-full" />
{:else}
  <span aria-hidden="true" class="{box} grid shrink-0 place-items-center rounded-full font-semibold {tone === 'accent' ? 'bg-accent text-accent-ink' : 'bg-well text-ink-soft'}">{initial}</span>
{/if}
