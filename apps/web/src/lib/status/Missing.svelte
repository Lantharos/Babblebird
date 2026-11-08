<script lang="ts">
  import type { MissingRow, Project } from "@babblebird/protocol"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { englishName, nativeName } from "#lib/languages.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"

  let { project }: { project: Project } = $props()
  const missing = $derived(resource<MissingRow[]>(`${projectPath(project.owner, project.name)}/missing`))
  let open = $state<MissingRow | null>(null)

  const total = (row: MissingRow, key: "missing" | "review" | "problems") =>
    row.areas.reduce((sum, area) => sum + area[key], 0)
  const sorted = $derived([...(missing.data ?? [])].sort((a, b) => total(b, "missing") - total(a, "missing")))
</script>

<section>
  <h2 class="text-[22px] font-semibold tracking-[-0.02em]">What’s missing</h2>
  {#if missing.data}
    <table class="mt-4 w-full text-[15px]">
      <thead class="text-left text-[13px] text-ink-muted">
        <tr><th class="py-2 font-normal">Language</th><th class="py-2 text-right font-normal">Missing</th><th class="py-2 text-right font-normal">To review</th><th class="py-2 text-right font-normal">With problems</th></tr>
      </thead>
      <tbody>
        {#each sorted as row (row.lang)}
          <tr class="cursor-pointer border-t border-hairline hover:bg-well/50" onclick={() => (open = row)}>
            <td class="py-2.5"><button type="button" class="text-left">{nativeName(row.lang)} <span class="text-ink-muted">{englishName(row.lang)}</span></button></td>
            <td class="py-2.5 text-right tabular">{total(row, "missing").toLocaleString()}</td>
            <td class="py-2.5 text-right tabular">{total(row, "review").toLocaleString()}</td>
            <td class="py-2.5 text-right tabular">{total(row, "problems").toLocaleString()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="placeholder mt-4 h-40"></div>
  {/if}
</section>

<Dialog open={open !== null} class="max-w-lg" onclose={() => (open = null)}>
  {#if open}
    <div class="max-h-[70vh] overflow-y-auto p-6">
      <h2 class="text-[20px] font-semibold">{nativeName(open.lang)}</h2>
      <ul class="mt-4 space-y-1 text-[15px]">
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
    </div>
  {/if}
</Dialog>
