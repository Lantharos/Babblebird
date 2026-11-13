<script lang="ts">
  let { keys }: { keys: string } = $props()
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
  const parts = $derived(keys.split("+").map((key) => (key === "mod" ? (mac ? "⌘" : "Ctrl") : key)))
</script>

<span class="inline-flex items-center gap-0.5" aria-hidden="true">
  {#each parts as part}
    <kbd class="min-w-5 rounded-md bg-current/16 px-1.5 text-center font-sans text-xs leading-5 font-medium">{part}</kbd>
  {/each}
</span>
