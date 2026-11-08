<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import { session } from "#lib/api/session.svelte.ts"
  import Header from "#lib/layout/Header.svelte"
  import AccessSection from "#lib/manage/AccessSection.svelte"
  import DangerSection from "#lib/manage/DangerSection.svelte"
  import DeliverySection from "#lib/manage/DeliverySection.svelte"
  import PeopleSection from "#lib/manage/PeopleSection.svelte"
  import Section from "#lib/manage/Section.svelte"
  import Summary from "#lib/manage/Summary.svelte"
  import SyncSection from "#lib/manage/SyncSection.svelte"
  import { projectResource } from "#lib/projects/project.svelte.ts"
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  const project = $derived(projectResource(page.params.owner!, page.params.name!))
  const refresh = () => void project.refresh()

  $effect(() => {
    if (session.loaded && !session.me)
      void goto(`/sign-in?next=${encodeURIComponent(page.url.pathname)}`, { replaceState: true })
  })
</script>

<svelte:head><title>Manage {project.data?.name ?? "project"} · Babblebird</title></svelte:head>

<Header />

<main class="page max-w-5xl pt-10 pb-8">
  <a href="/dashboard" class="inline-flex items-center gap-1.5 text-[15px] text-ink-muted hover:text-ink"><ArrowLeft class="size-4" />Your projects</a>
  {#if project.error}
    <p class="mt-8 text-danger">{project.error.message}</p>
  {:else if project.data && !project.data.can.admin}
    <h1 class="mt-6 text-[30px] font-semibold tracking-[-0.025em]">This isn’t yours to manage</h1>
    <p class="mt-2 text-[17px] text-ink-soft">Only people who can push to {project.data.owner}/{project.data.name}, or that its maintainers add, manage it here.</p>
    <a href="/p/{project.data.slug}" class="button button-quiet mt-6">Open the project</a>
  {:else if project.data}
    <div class="mt-8"><Summary project={project.data} onchange={refresh} /></div>
    <div class="mt-12">
      <SyncSection project={project.data} />
      <DeliverySection project={project.data} onchange={refresh} />
      <AccessSection project={project.data} onchange={refresh} />
      <PeopleSection project={project.data} />
      <Section title="Languages and areas" text="Both come from the repository, so there’s nothing to set up here.">
        <p class="max-w-md text-[15px] leading-relaxed text-ink-soft">
          A new folder under <code class="font-mono text-[13px] text-ink">locales/</code> adds a language. <code class="font-mono text-[13px] text-ink">babblebird.toml</code> names, groups and gives icons to areas.
        </p>
        <a href="/docs" class="button button-sm button-quiet mt-4">How it works</a>
      </Section>
    </div>
    <DangerSection project={project.data} />
  {:else}
    <div class="placeholder mt-8 h-40"></div>
  {/if}
</main>
