<script lang="ts">
  import type { ProjectSummary } from "@babblebird/protocol"
  import { linkGitHub, signInWithGitHub } from "#lib/api/auth.ts"
  import { ApiError, api } from "#lib/api/client.ts"
  import { session } from "#lib/api/session.svelte.ts"
  import Header from "#lib/layout/Header.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import GitHubMark from "#lib/ui/GitHubMark.svelte"
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  const installation = page.url.searchParams.get("installation_id")
  let projects = $state<ProjectSummary[] | null>(null)
  let problem = $state<string | null>(null)
  let failure = $state<string | null>(null)

  async function load() {
    try {
      projects = await api.get<ProjectSummary[]>(`/installations/${installation}`)
      problem = null
      failure = null
      if (projects.length === 1) await goto(`/p/${projects[0]!.slug}/import`, { replaceState: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) problem = error.message
      else failure = (error as Error).message
    }
  }

  const here = () => `${location.origin}${page.url.pathname}${page.url.search}`
  const unlinked = $derived(session.loaded && !!session.me && !session.me.githubLogin)

  $effect(() => {
    if (!session.loaded) return
    if (!installation) void goto("/dashboard", { replaceState: true })
    else if (!session.me) void signInWithGitHub(here())
    else if (session.me.githubLogin) void load()
  })

  poll(load, 2000, () => !unlinked && !failure && !!session.me && !projects?.length)
</script>

<svelte:head><title>Setting up · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page max-w-2xl pt-20 pb-24">
  {#if projects?.length}
    <h1 class="title">Reading your repositories</h1>
    <ul class="mt-8 space-y-2">
      {#each projects as project (project.slug)}
        <li><a href="/p/{project.slug}/import" class="link text-[17px]">{project.owner}/{project.name}</a></li>
      {/each}
    </ul>
  {:else if unlinked}
    <h1 class="title">Link your GitHub account</h1>
    <p class="mt-3 text-[17px] leading-relaxed text-ink-soft">
      You're signed in as {session.me?.email}. Link the GitHub account that added Babblebird so it can check the repository is yours.
    </p>
    <button type="button" class="button button-lg button-ink mt-8" onclick={() => linkGitHub(here())}>
      <GitHubMark class="size-5" />Link GitHub
    </button>
  {:else if failure}
    <h1 class="title">Setup didn’t finish</h1>
    <p class="mt-3 text-[17px] leading-relaxed text-ink-soft">{failure}</p>
    <button type="button" class="button button-quiet mt-8" onclick={load}>Try again</button>
  {:else}
    <h1 class="title">Waiting for GitHub</h1>
    <p class="mt-3 text-[17px] leading-relaxed text-ink-soft">
      {problem ?? "GitHub is telling Babblebird about your repository. This page moves on by itself in a few seconds."}
    </p>
  {/if}
</main>
