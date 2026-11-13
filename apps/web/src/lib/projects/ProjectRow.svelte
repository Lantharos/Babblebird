<script lang="ts">
  import type { Snippet } from "svelte"
  import ProjectIcon from "./ProjectIcon.svelte"

  let {
    project,
    href,
    children,
    trailing,
  }: {
    project: { owner: string; name: string; icon: string | null }
    href: string
    children: Snippet
    trailing?: Snippet
  } = $props()
</script>

<a {href} class="-mx-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-5 transition-colors hover:bg-well/60">
  <ProjectIcon {project} />
  <div class="min-w-0 flex-1">
    <p class="truncate text-[17px] font-semibold">{project.owner}/{project.name}</p>
    <p class="text-sm text-ink-muted">{@render children()}</p>
  </div>
  {@render trailing?.()}
</a>
