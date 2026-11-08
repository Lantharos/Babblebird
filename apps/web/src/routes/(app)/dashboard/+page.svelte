<script lang="ts">
  import { INSTALL_URL, type ProjectSummary, type Role } from "@babblebird/protocol"
  import Plus from "@lucide/svelte/icons/plus"
  import { api } from "#lib/api/client.ts"
  import { session } from "#lib/api/session.svelte.ts"
  import { when } from "#lib/editor/time.ts"
  import { nativeName } from "#lib/languages.ts"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import Importing from "#lib/projects/Importing.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import GitHubMark from "#lib/ui/GitHubMark.svelte"
  import { goto } from "$app/navigation"

  type Mine = ProjectSummary & { role: Role | null; memberLanguages: string[] | null }
  interface Work {
    project: string
    lang: string
    key: string | null
    kind: string
    at: number
  }

  let projects = $state<Mine[] | null>(null)
  let work = $state<Work[]>([])

  async function load() {
    projects = await api.get<Mine[]>("/me/projects")
  }

  $effect(() => {
    if (!session.loaded) return
    if (!session.me) void goto("/sign-in?next=/dashboard")
    else {
      void load()
      void api.get<Work[]>("/me/work").then((found) => (work = found))
    }
  })

  poll(load, 3000, () => !!projects?.some((project) => project.importing))

  const owned = $derived(projects?.filter((project) => project.role === "admin") ?? [])
  const translating = $derived(projects?.filter((project) => project.role !== "admin") ?? [])
  const target = (project: Mine) =>
    project.importing ? `/p/${project.slug}/import` : `/dashboard/p/${project.slug}`
</script>

<svelte:head><title>Your projects · Babblebird</title></svelte:head>

<Header />

<main class="page pt-12">
  <div class="flex flex-wrap items-end justify-between gap-6">
    <h1 class="text-[36px] font-semibold tracking-[-0.03em]">Your projects</h1>
    <a href={INSTALL_URL} class="button button-ink"><Plus class="size-4" />Add a repository</a>
  </div>

  {#if projects === null}
    <div class="placeholder mt-12 h-32"></div>
  {:else}
    {#if owned.length}
      <ul class="mt-10 divide-y divide-hairline">
        {#each owned as project (project.slug)}
          <li>
            <a href={project.state === "removed" ? INSTALL_URL : target(project)} class="-mx-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-5 hover:bg-well/60">
              <img src="https://github.com/{project.owner}.png?size=96" alt="" class="size-11 rounded-xl bg-well" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-[17px] font-semibold">{project.owner}/{project.name}</p>
                {#if project.state === "removed"}
                  <p class="text-sm text-caution">Disconnected from GitHub. Add it again to reconnect.</p>
                {:else if project.state === "failed"}
                  <p class="text-sm text-danger">The last sync didn’t work</p>
                {:else if !project.importing}
                  <p class="text-sm text-ink-muted tabular">{project.strings.toLocaleString()} strings · {project.languages} languages</p>
                {/if}
              </div>
              {#if project.importing}<Importing importing={project.importing} class="w-56" />{/if}
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="mt-12 max-w-xl">
        <p class="text-[20px] font-semibold">No repositories yet</p>
        {#if session.me?.githubLogin}
          <p class="mt-2 text-[17px] leading-relaxed text-ink-soft">Add Babblebird to a repository on GitHub and it shows up here while its translations are read in.</p>
        {:else}
          <p class="mt-2 text-[17px] leading-relaxed text-ink-soft">Sign in with GitHub too, so Babblebird can see which repositories are yours.</p>
          <a href="/sign-in?next=/dashboard" class="button button-quiet mt-6"><GitHubMark class="size-4" />Sign in with GitHub</a>
        {/if}
      </div>
    {/if}

    {#if translating.length || session.me?.languages.length}
      <section class="mt-20">
        <h2 class="text-[24px] font-semibold tracking-[-0.02em]">Translating</h2>
        {#if session.me?.languages.length}
          <p class="mt-1 text-[15px] text-ink-soft">Into {session.me.languages.map(nativeName).join(", ")}</p>
        {/if}
        <ul class="mt-6 flex flex-wrap gap-3">
          {#each translating as project (project.slug)}
            <li>
              <a href="/p/{project.slug}{project.memberLanguages?.[0] ? `/${project.memberLanguages[0]}` : ''}" class="button button-quiet">
                {project.owner}/{project.name}{project.role === "reviewer" ? " · reviewer" : ""}
              </a>
            </li>
          {/each}
          <li><a href="/projects" class="button button-quiet">Find a project to help with</a></li>
        </ul>
      </section>
    {/if}

    {#if work.length}
      <section class="mt-20">
        <h2 class="text-[24px] font-semibold tracking-[-0.02em]">Your recent work</h2>
        <ol class="mt-4 divide-y divide-hairline text-[15px]">
          {#each work as entry, index (index)}
            <li class="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
              <span><span class="font-mono text-[13px] text-ink-soft">{entry.key}</span> · {entry.kind} in {nativeName(entry.lang)}</span>
              <span class="text-ink-muted">{entry.project} · {when(entry.at)}</span>
            </li>
          {/each}
        </ol>
      </section>
    {/if}
  {/if}
</main>

<Footer />
