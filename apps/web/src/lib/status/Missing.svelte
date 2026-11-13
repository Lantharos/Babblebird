<script lang="ts">
  import type { MissingRow, Project } from "@babblebird/protocol"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { englishName, nativeName } from "#lib/format/languages.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Loaded from "#lib/ui/Loaded.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"

  let { project }: { project: Project } = $props()
  const missing = $derived(resource<MissingRow[]>(`${projectPath(project.owner, project.name)}/missing`))
  let open = $state<MissingRow | null>(null)

  const COLUMNS =
    "grid grid-cols-[minmax(0,1fr)_repeat(3,4rem)] gap-2 sm:grid-cols-[minmax(0,1fr)_repeat(3,7rem)] sm:gap-3"
  const total = (row: MissingRow, key: "missing" | "review" | "problems") =>
    row.areas.reduce((sum, area) => sum + area[key], 0)
  const sorted = (rows: MissingRow[]) => rows.toSorted((a, b) => total(b, "missing") - total(a, "missing"))
</script>

<section>
  <h2 class="text-[22px] font-semibold tracking-[-0.02em]">What’s missing</h2>
  <div class="mt-4">
    <Loaded data={missing.data} error={missing.error} retry={() => missing.refresh()}>
      {#snippet children(rows)}
        <p class="{COLUMNS} -mx-3 items-end px-3 py-2 text-right text-small text-ink-muted">
          <span class="text-left">Language</span><span>Missing</span><span>To review</span><span>With problems</span>
        </p>
        <ul class="-mx-3 text-body">
          {#each sorted(rows) as row (row.lang)}
            <li>
              <button
                type="button"
                aria-label="{nativeName(row.lang)}: {total(row, 'missing')} missing, {total(row, 'review')} to review, {total(row, 'problems')} with problems"
                class="{COLUMNS} w-full items-baseline rounded-xl px-3 py-2.5 text-right transition-colors hover:bg-well"
                onclick={() => (open = row)}
              >
                <span class="truncate text-left">{nativeName(row.lang)} <span class="hidden text-ink-muted sm:inline">{englishName(row.lang)}</span></span>
                <span class="tabular">{total(row, "missing").toLocaleString()}</span>
                <span class="tabular">{total(row, "review").toLocaleString()}</span>
                <span class="tabular">{total(row, "problems").toLocaleString()}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/snippet}
    </Loaded>
  </div>
</section>

<Dialog open={open !== null} class="max-w-lg" onclose={() => (open = null)}>
  {#if open}
    <h2 class="text-[20px] font-semibold">{nativeName(open.lang)}</h2>
    <ul class="mt-4 space-y-1 text-body">
      {#each open.areas.filter((area) => area.missing || area.review || area.problems) as area (area.slug)}
        <li>
          <a href="/p/{project.slug}/{open.lang}/{area.slug}" class="-mx-3 flex justify-between gap-4 rounded-xl px-3 py-2 hover:bg-well">
            <span>{area.name}</span>
            <span class="text-ink-muted tabular">{area.missing} missing{area.review ? ` · ${area.review} to review` : ""}</span>
          </a>
        </li>
      {:else}
        <li class="text-ink-soft">Everything is translated. Somebody deserves a treat.</li>
      {/each}
    </ul>
  {/if}
</Dialog>
