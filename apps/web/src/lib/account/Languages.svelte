<script lang="ts">
  import { KNOWN_LANGUAGES } from "@babblebird/protocol"
  import Plus from "@lucide/svelte/icons/plus"
  import { session } from "#lib/api/session.svelte.ts"
  import { englishName, nativeName } from "#lib/format/languages.ts"
  import Chip from "#lib/ui/fields/Chip.svelte"
  import SearchField from "#lib/ui/fields/SearchField.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  let open = $state(false)
  let search = $state("")
  const mine = $derived(session.me?.languages ?? [])
  const offered = $derived(
    KNOWN_LANGUAGES.filter((lang) => lang !== "en" && !mine.includes(lang))
      .filter((lang) =>
        `${nativeName(lang)} ${englishName(lang)}`.toLowerCase().includes(search.trim().toLowerCase()),
      )
      .sort((a, b) => englishName(a).localeCompare(englishName(b))),
  )

  async function save(languages: string[]) {
    await session.setLanguages(languages).catch(toasts.error)
  }
</script>

<section class="mt-10 space-y-3">
  <h2 class="text-[20px] font-semibold">Languages you translate into</h2>
  <p class="text-body text-ink-soft">These come first everywhere.</p>
  {#if mine.length}
    <ul class="flex flex-wrap gap-2">
      {#each mine as lang (lang)}
        <li><Chip remove="Remove {englishName(lang)}" onremove={() => save(mine.filter((other) => other !== lang))}>{nativeName(lang)}</Chip></li>
      {/each}
    </ul>
  {/if}
  <button type="button" class="button button-quiet" onclick={() => ((search = ""), (open = true))}><Plus class="size-4" />Add a language</button>
</section>

<Dialog bind:open class="max-w-md">
  <h2 class="text-[20px] font-semibold">Add a language</h2>
  <SearchField bind:value={search} label="Search languages" class="mt-4" />
  <ul class="mt-3 max-h-80 overflow-y-auto">
    {#each offered as lang (lang)}
      <li>
        <button type="button" class="-mx-2 flex w-[calc(100%+1rem)] justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-well" onclick={() => { void save([...mine, lang]); open = false }}>
          <span>{nativeName(lang)}</span><span class="text-ink-muted">{englishName(lang)}</span>
        </button>
      </li>
    {/each}
  </ul>
</Dialog>
