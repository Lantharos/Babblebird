<script lang="ts">
  let {
    project,
    class: className = "size-11 rounded-xl",
  }: { project: { owner: string; icon: string | null }; class?: string } = $props()
</script>

<img src={project.icon ?? `https://github.com/${project.owner}.png?size=128`} alt="" class="shrink-0 bg-well object-contain {className}" loading="lazy" />
