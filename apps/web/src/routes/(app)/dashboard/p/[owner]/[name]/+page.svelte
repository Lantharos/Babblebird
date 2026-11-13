<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import { session } from "#lib/api/session.svelte.ts"
  import Header from "#lib/layout/Header.svelte"
  import Summary from "#lib/manage/Summary.svelte"
  import AccessSection from "#lib/manage/sections/AccessSection.svelte"
  import DangerSection from "#lib/manage/sections/DangerSection.svelte"
  import DeliverySection from "#lib/manage/sections/DeliverySection.svelte"
  import PeopleSection from "#lib/manage/sections/PeopleSection.svelte"
  import SyncSection from "#lib/manage/sections/SyncSection.svelte"
  import { projectResource } from "#lib/projects/project.svelte.ts"
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  const project = $derived(projectResource(page.params.owner!, page.params.name!))
  const refresh = () => project.refresh()

  $effect(() => {
    if (session.loaded && !session.me)
      void goto(`/sign-in?next=${encodeURIComponent(page.url.pathname)}`, { replaceState: true })
  })
</script>

<svelte:head><title>Manage {project.data?.name ?? "project"} · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page max-w-5xl pt-10 pb-24">
  <a href="/dashboard" class="inline-flex items-center gap-1.5 text-body text-ink-muted hover:text-ink"><ArrowLeft class="size-4" />Your projects</a>
  {#if project.error}
    <p class="mt-8 text-danger">{project.error.message}</p>
  {:else if project.data && !project.data.can.admin}
    <h1 class="title mt-6">This isn’t yours to manage</h1>
    <p class="mt-2 text-[17px] text-ink-soft">Only people who can push to {project.data.owner}/{project.data.name}, or that its maintainers add, manage it here.</p>
    <a href="/p/{project.data.slug}" class="button button-quiet mt-6">Open the project</a>
  {:else if project.data}
    <div class="mt-8"><Summary project={project.data} /></div>
    <div class="mt-10">
      <SyncSection project={project.data} onchange={refresh} />
      <DeliverySection project={project.data} onchange={refresh} />
      <AccessSection project={project.data} onchange={refresh} />
      <PeopleSection project={project.data} />
    </div>
    <DangerSection project={project.data} />
  {:else}
    <div class="placeholder mt-8 h-40"></div>
  {/if}
</main>
