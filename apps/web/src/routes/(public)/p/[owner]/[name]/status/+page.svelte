<script lang="ts">
  import Header from "#lib/layout/Header.svelte"
  import ProjectHeader from "#lib/projects/ProjectHeader.svelte"
  import { projectResource } from "#lib/projects/project.svelte.ts"
  import Badge from "#lib/status/Badge.svelte"
  import Missing from "#lib/status/Missing.svelte"
  import Loaded from "#lib/ui/Loaded.svelte"
  import { page } from "$app/state"

  const project = $derived(projectResource(page.params.owner!, page.params.name!))
</script>

<svelte:head><title>What’s missing · {project.data?.name ?? "Project"} · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page pt-10 pb-24">
  <Loaded data={project.data} error={project.error} retry={() => project.refresh()}>
    {#snippet children(found)}
      <ProjectHeader project={found} />
      <div class="mt-10 grid grid-cols-[minmax(0,1fr)] gap-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Missing project={found} />
        <Badge project={found} />
      </div>
    {/snippet}
  </Loaded>
</main>
