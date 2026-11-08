<script lang="ts">
  let { class: className = "size-8" }: { class?: string } = $props()
</script>

<svg viewBox="12 14 44 38" aria-hidden="true" class="shrink-0 overflow-visible {className}">
  <path d="M30 16a16 16 0 1 1-9.4 28.94L13 49l2.9-8.6A16 16 0 0 1 30 16Z" fill="var(--accent-bird)" />
  <path d="M45.6 28.2 54 31.6l-8.6 3.1a16 16 0 0 0 .2-6.5Z" fill="var(--beak)" />
  <circle cx="37.5" cy="27" r="2.8" fill="var(--canvas)" />
</svg>
