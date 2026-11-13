<script lang="ts">
  import type { ImportStatus } from "@babblebird/protocol"
  import { api } from "#lib/api/client.ts"
  import { percent } from "#lib/format/languages.ts"
  import Header from "#lib/layout/Header.svelte"
  import AreaIcon from "#lib/projects/AreaIcon.svelte"
  import ProgressBar from "#lib/projects/ProgressBar.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import { page } from "$app/state"

  const { owner, name } = page.params as { owner: string; name: string }
  let status = $state<ImportStatus | null>(null)
  let failure = $state<string | null>(null)
  let now = $state(Date.now())

  async function load() {
    try {
      status = await api.get<ImportStatus>(`/projects/${owner}/${name}/import`)
      failure = null
      now = Date.now()
    } catch (error) {
      failure = (error as Error).message
    }
  }

  $effect(() => void load())
  poll(load, 1500, () => !status || status.state === "scanning")

  const importing = $derived(status?.importing ?? null)
  const finished = $derived(status !== null && status.state !== "scanning")
  const done = $derived(
    importing ? percent(Math.min(importing.done, importing.total), importing.total) : finished ? 100 : 0,
  )

  function remaining() {
    if (!importing?.startedAt || !importing.done) return null
    const rate = importing.done / (now - importing.startedAt)
    const minutes = Math.ceil((importing.total - importing.done) / rate / 60_000)
    if (minutes <= 1) return "Less than a minute left"
    return `About ${minutes} minutes left`
  }

  function step() {
    if (failure) return failure
    if (!status) return "Starting"
    if (status.state === "failed") return status.problem ?? "Something went wrong"
    if (finished) return "Everything is read in"
    if (!importing?.done) return "Reading the repository and finding its areas"
    return `Reading translation files, ${Math.min(importing.done, importing.total).toLocaleString()} of ${importing.total.toLocaleString()}`
  }

  const counts = $derived(
    status
      ? [
          { value: status.areas.length, label: "areas" },
          { value: status.strings, label: "strings" },
          { value: status.translations, label: "translations" },
          { value: status.languages, label: "languages" },
        ]
      : [],
  )
</script>

<svelte:head><title>Importing {owner}/{name} · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page pt-14 pb-24">
  <div class="flex flex-wrap items-end justify-between gap-6">
    <div>
      <h1 class="title">{finished ? "All read in" : "Reading your translations"}</h1>
      <p class="mt-1 font-mono text-body text-ink-muted">{owner}/{name}</p>
    </div>
    <p class="text-[56px] leading-none font-semibold tracking-[-0.04em] tabular sm:text-[72px]">{done}%</p>
  </div>

  <ProgressBar class="mt-8" value={Math.max(done, 2)} tone={finished ? "done" : "accent"} size="lg" />
  <p class="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[16px] text-ink-soft" role="status">
    <span class={failure || status?.state === "failed" ? "text-danger" : ""}>{step()}</span>
    {#if !finished && remaining()}<span class="text-ink-muted">{remaining()}</span>{/if}
  </p>

  {#if status}
    <dl class="mt-14 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
      {#each counts as count}
        <div>
          <dt class="text-body text-ink-muted">{count.label}</dt>
          <dd class="mt-1 text-[34px] font-semibold tracking-[-0.03em] tabular">{count.value.toLocaleString()}</dd>
        </div>
      {/each}
    </dl>

    {#if finished}
      <div class="mt-12 flex flex-wrap gap-3">
        <a href="/p/{owner}/{name}" class="button button-ink">Open the project</a>
        <a href="/p/{owner}/{name}/status" class="button button-quiet">See what’s missing</a>
      </div>
    {/if}

    <ul class="mt-16 grid grid-cols-3 gap-x-6 gap-y-8 sm:grid-cols-5 lg:grid-cols-8">
      {#each status.areas as area (area.slug)}
        <li class="appear flex flex-col items-center gap-2 text-center">
          <AreaIcon name={area.name} icon={area.icon} class="size-14 transition-opacity {area.strings ? '' : 'opacity-40'}" />
          <span class="line-clamp-2 text-[14px] leading-tight {area.strings ? 'text-ink' : 'text-ink-muted'}">{area.name}</span>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  @media (prefers-reduced-motion: no-preference) {
    .appear {
      animation: appear var(--spring-smooth-duration) var(--spring-smooth) both;
    }
  }

  @keyframes appear {
    from {
      opacity: 0;
      scale: 0.9;
    }
  }
</style>
