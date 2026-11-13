<script lang="ts">
  import { seed } from "#lib/api/resource.svelte.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import { page } from "$app/state"

  let { data, children } = $props()

  $effect(() => seed(projectPath(page.params.owner!, page.params.name!), data.project))
</script>

{@render children()}
