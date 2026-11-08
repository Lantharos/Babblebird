<script lang="ts">
  let { class: className = "size-8" }: { class?: string } = $props()
</script>

<svg viewBox="12 16 44 36" aria-hidden="true" class="shrink-0 overflow-visible {className}">
  <path d="M41.6 22.6 54.5 26.4 45 33.4 30 32Z" fill="var(--beak)" />
  <circle cx="30" cy="32" r="15" fill="var(--accent-bird)" />
  <path d="M23.2 45.3 12.6 50.5 16.8 39.3 30 32Z" fill="var(--accent-bird)" />
  <circle cx="36.2" cy="27" r="2.9" fill="var(--canvas)" />
</svg>
