<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import Settings2 from "@lucide/svelte/icons/settings-2"
  import GitHubMark from "#lib/ui/GitHubMark.svelte"
  import { page } from "$app/state"
  import Importing from "./Importing.svelte"
  import ProjectIcon from "./ProjectIcon.svelte"

  let { project }: { project: Project } = $props()
  const base = $derived(`/p/${project.slug}`)
  const tabs = $derived([
    { href: base, label: "Languages", active: !page.url.pathname.endsWith("/status") },
    { href: `${base}/status`, label: "What’s missing", active: page.url.pathname.endsWith("/status") },
  ])
</script>

<div class="flex flex-wrap items-center gap-4">
  <ProjectIcon {project} class="size-14 rounded-2xl" />
  <div class="min-w-0 flex-1">
    <h1 class="text-[30px] leading-tight font-semibold tracking-[-0.025em]">{project.name}</h1>
    <p class="text-[15px] text-ink-muted">{project.owner}</p>
  </div>
  <div class="flex gap-2">
    {#if project.can.admin}<a href="/dashboard/p/{project.slug}" class="button button-sm button-ink"><Settings2 class="size-4" />Manage</a>{/if}
    <a href="https://github.com/{project.owner}/{project.name}" class="button button-sm button-quiet"><GitHubMark class="size-4" />Repository</a>
  </div>
</div>
{#if project.description}<p class="mt-4 max-w-2xl text-[17px] text-ink-soft">{project.description}</p>{/if}
{#if project.paused}
  <p class="mt-4 text-[15px] text-caution">Babblebird has paused this project for now, so it can’t be translated or synced. Write to hello@babblebird.dev if you think that’s a mistake.</p>
{:else if project.importing}
  <a href="/p/{project.slug}/import" class="mt-6 block max-w-md"><Importing importing={project.importing} /></a>
{:else if project.state === "failed" && project.problem && project.can.admin}
  <p class="mt-4 text-[15px] text-danger">The last sync didn’t work: {project.problem}</p>
{/if}
<nav class="mt-8 flex gap-1" aria-label="Project">
  {#each tabs as tab}
    <a href={tab.href} aria-current={tab.active ? "page" : undefined} class="rounded-full px-4 py-1.5 text-[15px] font-medium transition-colors {tab.active ? 'bg-ink text-canvas' : 'text-ink-soft hover:bg-well'}">{tab.label}</a>
  {/each}
</nav>
