<script lang="ts">
  let { class: className = "size-8" }: { class?: string } = $props()
</script>

<svg viewBox="0 0 64 64" aria-hidden="true" class="shrink-0 {className}">
  <rect width="64" height="64" rx="16" fill="#cf4f0e" />
  <path d="M30 16a16 16 0 1 1-9.4 28.94L13 49l2.9-8.6A16 16 0 0 1 30 16Z" fill="#ffffff" />
  <path d="M45.6 28.2 54 31.6l-8.6 3.1a16 16 0 0 0 .2-6.5Z" fill="#ffd166" />
  <circle cx="37.5" cy="27" r="2.6" fill="#12161b" />
</svg>
