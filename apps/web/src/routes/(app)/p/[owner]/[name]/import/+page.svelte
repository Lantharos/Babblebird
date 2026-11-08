<script lang="ts">
  import type { ImportStatus } from "@babblebird/protocol"
  import { api } from "#lib/api/client.ts"
  import { percent } from "#lib/languages.ts"
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
  import AreaIcon from "#lib/projects/AreaIcon.svelte"
  import { poll } from "#lib/projects/poll.svelte.ts"
  import { page } from "$app/state"

  const { owner, name } = page.params as { owner: string; name: string }
  let status = $state<ImportStatus | null>(null)
  let now = $state(Date.now())

  async function load() {
    status = await api.get<ImportStatus>(`/projects/${owner}/${name}/import`)
    now = Date.now()
  }

  $effect(() => void load())
  poll(load, 1500, () => !status || status.state === "scanning")

  const importing = $derived(status?.importing ?? null)
  const done = $derived(importing ? percent(Math.min(importing.done, importing.total), importing.total) : 100)
  const finished = $derived(status !== null && status.state !== "scanning")

  function remaining() {
    if (!importing?.startedAt || !importing.done) return null
    const rate = importing.done / (now - importing.startedAt)
    const minutes = Math.ceil((importing.total - importing.done) / rate / 60_000)
    if (minutes <= 1) return "Less than a minute left"
    return `About ${minutes} minutes left`
  }

  function step() {
    if (!status) return "Starting"
    if (status.state === "failed") return status.problem ?? "Something went wrong"
    if (finished) return "Everything is read in"
    if (!importing || !importing.done) return "Reading the repository and finding its areas"
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

<main class="page pt-14">
  <p class="font-mono text-[15px] text-ink-muted">{owner}/{name}</p>
  <div class="mt-3 flex flex-wrap items-end justify-between gap-6">
    <h1 class="text-[40px] font-semibold tracking-[-0.03em] sm:text-[52px]">{finished ? "All read in" : "Reading your translations"}</h1>
    <p class="font-semibold text-[56px] leading-none tracking-[-0.04em] tabular sm:text-[72px]">{done}%</p>
  </div>

  <div class="mt-8 h-2.5 overflow-hidden rounded-full bg-well" aria-hidden="true">
    <span class="block h-full rounded-full transition-[width] duration-700 {finished ? 'bg-done' : 'bg-accent'}" style:width="{Math.max(done, 2)}%"></span>
  </div>
  <p class="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[16px] text-ink-soft" role="status">
    <span class={status?.state === "failed" ? "text-danger" : ""}>{step()}</span>
    {#if !finished && remaining()}<span class="text-ink-muted">{remaining()}</span>{/if}
  </p>

  {#if status}
    <dl class="mt-14 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
      {#each counts as count}
        <div>
          <dt class="text-[15px] text-ink-muted">{count.label}</dt>
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

<Footer />

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
