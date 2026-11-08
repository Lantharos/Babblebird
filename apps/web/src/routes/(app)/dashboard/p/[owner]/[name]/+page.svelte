<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left"
  import { session } from "#lib/api/session.svelte.ts"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import Delivery from "#lib/manage/Delivery.svelte"
  import Members from "#lib/manage/Members.svelte"
  import Remove from "#lib/manage/Remove.svelte"
  import Sync from "#lib/manage/Sync.svelte"
  import { projectResource } from "#lib/projects/project.svelte.ts"
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  const project = $derived(projectResource(page.params.owner!, page.params.name!))

  $effect(() => {
    if (session.loaded && !session.me)
      void goto(`/sign-in?next=${encodeURIComponent(page.url.pathname)}`, { replaceState: true })
  })
</script>

<svelte:head><title>Manage {project.data?.name ?? "project"} · Babblebird</title></svelte:head>

<Header />

<main class="page max-w-4xl pt-10">
  <a href="/dashboard" class="inline-flex items-center gap-1.5 text-[15px] text-ink-muted hover:text-ink"><ArrowLeft class="size-4" />Your projects</a>
  {#if project.error}
    <p class="mt-8 text-danger">{project.error.message}</p>
  {:else if project.data && !project.data.can.admin}
    <h1 class="mt-6 text-[30px] font-semibold tracking-[-0.025em]">This isn’t yours to manage</h1>
    <p class="mt-2 text-[17px] text-ink-soft">Only people who can push to {project.data.owner}/{project.data.name}, or that its maintainers add, manage it here.</p>
    <a href="/p/{project.data.slug}" class="button button-quiet mt-6">Open the project</a>
  {:else if project.data}
    <div class="mt-6 flex flex-wrap items-center gap-4">
      <img src="https://github.com/{project.data.owner}.png?size=128" alt="" class="size-14 rounded-2xl bg-well" />
      <div class="min-w-0 flex-1">
        <h1 class="text-[30px] leading-tight font-semibold tracking-[-0.025em]">{project.data.owner}/{project.data.name}</h1>
        <p class="text-[15px] text-ink-muted">{project.data.strings.toLocaleString()} strings · {project.data.languages.length} languages</p>
      </div>
      <a href="/p/{project.data.slug}" class="button button-sm button-quiet">Open as a translator</a>
    </div>
    <div class="mt-14 space-y-16">
      <Sync project={project.data} onchange={() => project.refresh()} />
      <Delivery project={project.data} onchange={() => project.refresh()} />
      <Members project={project.data} />
      <p class="max-w-xl text-[15px] text-ink-soft">
        Languages come from the repository: a new folder under <code class="font-mono text-[13px]">locales/</code> adds one, and
        <code class="font-mono text-[13px]">babblebird.toml</code> names and groups the areas.
      </p>
      <Remove project={project.data} />
    </div>
  {:else}
    <div class="placeholder mt-8 h-40"></div>
  {/if}
</main>

<Footer />
