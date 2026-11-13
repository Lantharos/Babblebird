<script lang="ts">
  import { INSTALL_URL, type ProjectSummary, type Role } from "@babblebird/protocol"
  import Plus from "@lucide/svelte/icons/plus"
  import { linkGitHub } from "#lib/api/auth.ts"
  import { api } from "#lib/api/client.ts"
  import { getSession } from "#lib/api/session.svelte.ts"
  import { nativeName } from "#lib/format/languages.ts"
  import { when } from "#lib/format/time.ts"
  import Header from "#lib/layout/Header.svelte"
  import { roleName } from "#lib/manage/people.svelte.ts"
  import Importing from "#lib/projects/Importing.svelte"
  import ProjectRow from "#lib/projects/ProjectRow.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import SearchField from "#lib/ui/fields/SearchField.svelte"
  import GitHubMark from "#lib/ui/GitHubMark.svelte"
  import { goto } from "$app/navigation"

  const session = getSession()

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

  let search = $state("")
  const matches = (project: Mine) =>
    `${project.owner}/${project.name} ${project.description ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  const admin = $derived(projects?.filter((project) => project.role === "admin") ?? [])
  const owned = $derived(admin.filter(matches))
  const translating = $derived(
    projects?.filter((project) => project.role !== "admin" && matches(project)) ?? [],
  )
  const target = (project: Mine) =>
    project.state === "removed"
      ? INSTALL_URL
      : project.importing
        ? `/p/${project.slug}/import`
        : `/dashboard/p/${project.slug}`
  const translateIn = (project: Mine) =>
    `/p/${project.slug}${project.memberLanguages?.[0] ? `/${project.memberLanguages[0]}` : ""}`
  const scopeOf = (project: Mine) =>
    [
      project.role ? roleName(project.role) : null,
      project.memberLanguages?.map(nativeName).join(", ") || null,
    ]
      .filter(Boolean)
      .join(" · ") || `${project.strings.toLocaleString()} strings · ${project.languages} languages`
</script>

<svelte:head><title>Your projects · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page pt-12 pb-24">
  <div class="flex flex-wrap items-end justify-between gap-6">
    <h1 class="title">Your projects</h1>
    <a href={INSTALL_URL} class="button button-ink"><Plus class="size-4" />Add a repository</a>
  </div>

  {#if (projects?.length ?? 0) > 5}
    <SearchField bind:value={search} label="Search your projects" placeholder="Search your projects" class="mt-8 max-w-sm" />
  {/if}

  {#if projects === null}
    <div class="placeholder mt-12 h-32"></div>
  {:else}
    {#if owned.length}
      <ul class="mt-10 divide-y divide-hairline">
        {#each owned as project (project.slug)}
          <li>
            <ProjectRow {project} href={target(project)}>
              {#if project.state === "removed"}
                <span class="text-caution">Disconnected from GitHub. Add it again to reconnect.</span>
              {:else if project.state === "failed"}
                <span class="text-danger">The last sync didn’t work</span>
              {:else if !project.importing}
                <span class="tabular">{project.strings.toLocaleString()} strings · {project.languages} languages</span>
              {/if}
              {#snippet trailing()}
                {#if project.importing}<Importing importing={project.importing} class="w-56" />{/if}
              {/snippet}
            </ProjectRow>
          </li>
        {/each}
      </ul>
    {:else if admin.length}
      <p class="mt-10 text-ink-muted">No project matches that.</p>
    {:else}
      <div class="mt-12 max-w-xl">
        <p class="text-[20px] font-semibold">No repositories yet</p>
        {#if session.me?.githubLogin}
          <p class="mt-2 text-[17px] leading-relaxed text-ink-soft">Add Babblebird to a repository on GitHub and it shows up here.</p>
        {:else}
          <p class="mt-2 text-[17px] leading-relaxed text-ink-soft">Link GitHub so Babblebird can see which repositories are yours.</p>
          <button type="button" class="button button-quiet mt-6" onclick={() => linkGitHub(location.href)}><GitHubMark class="size-4" />Link GitHub</button>
        {/if}
      </div>
    {/if}

    {#if translating.length || session.me?.languages.length}
      <section class="mt-20">
        <h2 class="text-[24px] font-semibold tracking-[-0.02em]">Translating</h2>
        {#if session.me?.languages.length}
          <p class="mt-1 text-body text-ink-soft">Into {session.me.languages.map(nativeName).join(", ")} · <a href="/settings" class="link">Change</a></p>
        {/if}
        {#if translating.length}
          <ul class="mt-6 divide-y divide-hairline">
            {#each translating as project (project.slug)}
              <li><ProjectRow {project} href={translateIn(project)}>{scopeOf(project)}</ProjectRow></li>
            {/each}
          </ul>
        {/if}
        <a href="/projects" class="button button-quiet mt-6">Find a project to help with</a>
      </section>
    {/if}

    {#if work.length}
      <section class="mt-20">
        <h2 class="text-[24px] font-semibold tracking-[-0.02em]">Your recent work</h2>
        <ol class="mt-4 divide-y divide-hairline text-body">
          {#each work as entry, index (index)}
            <li class="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
              <span><span class="font-mono text-small text-ink-soft">{entry.key}</span> · {entry.kind} in {nativeName(entry.lang)}</span>
              <span class="text-ink-muted">{entry.project} · {when(entry.at)}</span>
            </li>
          {/each}
        </ol>
      </section>
    {/if}
  {/if}
</main>
