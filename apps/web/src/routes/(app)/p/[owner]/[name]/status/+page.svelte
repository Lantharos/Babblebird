<script lang="ts">
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import ProjectHeader from "#lib/projects/ProjectHeader.svelte"
  import { projectResource } from "#lib/projects/project.svelte.ts"
  import Badge from "#lib/status/Badge.svelte"
  import Delivery from "#lib/status/Delivery.svelte"
  import Members from "#lib/status/Members.svelte"
  import Missing from "#lib/status/Missing.svelte"
  import { page } from "$app/state"

  const project = $derived(projectResource(page.params.owner!, page.params.name!))
</script>

<svelte:head><title>Status · {project.data?.name ?? "Project"} · Babblebird</title></svelte:head>

<Header />

<main class="page pt-10">
  {#if project.data}
    <ProjectHeader project={project.data} />
    <div class="mt-10 grid gap-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Missing project={project.data} />
      <div class="space-y-14">
        <Badge project={project.data} />
        {#if project.data.can.admin}
          <Delivery project={project.data} onchange={() => project.refresh()} />
          <Members project={project.data} />
        {/if}
      </div>
    </div>
  {:else if project.error}
    <p class="text-danger">{project.error.message}</p>
  {/if}
</main>

<Footer />
