<script lang="ts">
  let {
    name,
    icon,
    class: className = "size-12",
  }: { name: string; icon: string | null; class?: string } = $props()

  const hue = $derived([...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 360, 7))
  const shape = $derived(hue % 3)
</script>

{#if icon}
  <img src={icon} alt="" class="shrink-0 rounded-[22%] object-contain {className}" loading="lazy" />
{:else}
  <svg viewBox="0 0 48 48" aria-hidden="true" class="shrink-0 {className}">
    <rect width="48" height="48" rx="11" fill="oklch(0.9 0.04 {hue})" class="dark:hidden" />
    <rect width="48" height="48" rx="11" fill="oklch(0.32 0.05 {hue})" class="hidden dark:block" />
    {#if shape === 0}
      <circle cx="24" cy="24" r="11" fill="oklch(0.62 0.12 {hue})" />
    {:else if shape === 1}
      <rect x="13" y="13" width="22" height="22" rx="6" fill="oklch(0.62 0.12 {hue})" />
    {:else}
      <path d="M24 12 36 34H12Z" fill="oklch(0.62 0.12 {hue})" stroke="oklch(0.62 0.12 {hue})" stroke-width="3" stroke-linejoin="round" />
    {/if}
  </svg>
{/if}
