<script lang="ts">
  let {
    project,
    class: className = "size-11 rounded-xl",
  }: { project: { owner: string; icon: string | null }; class?: string } = $props()
</script>

{#if project.icon}
  <img src={project.icon} alt="" class="shrink-0 object-contain {className}" loading="lazy" />
{:else}
  <img src="https://github.com/{project.owner}.png?size=128" alt="" class="shrink-0 bg-well object-cover {className}" loading="lazy" />
{/if}
