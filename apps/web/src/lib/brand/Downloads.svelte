<script lang="ts">
  import Download from "@lucide/svelte/icons/download"

  let { files }: { files: { label: string; href: string }[] } = $props()
</script>

<div class="flex flex-wrap gap-2">
  {#each files as entry (entry.href)}
    <a href={entry.href} download class="button button-sm button-quiet"><Download class="size-3.5" />{entry.label}</a>
  {/each}
</div>
