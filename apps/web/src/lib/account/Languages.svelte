<script lang="ts">
  import { KNOWN_LANGUAGES } from "@babblebird/protocol"
  import Plus from "@lucide/svelte/icons/plus"
  import X from "@lucide/svelte/icons/x"
  import { session } from "#lib/api/session.svelte.ts"
  import { englishName, nativeName } from "#lib/languages.ts"
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
  <p class="text-[15px] text-ink-soft">These come first everywhere. A language is added here when you pick it or save a translation in it.</p>
  {#if mine.length}
    <ul class="flex flex-wrap gap-2">
      {#each mine as lang (lang)}
        <li class="flex items-center gap-1 rounded-full bg-well py-1 pr-1 pl-3.5 text-[15px]">
          {nativeName(lang)}
          <button type="button" class="grid size-7 place-items-center rounded-full hover:bg-[color-mix(in_oklab,var(--ink)_10%,transparent)]" aria-label="Remove {englishName(lang)}" onclick={() => save(mine.filter((other) => other !== lang))}><X class="size-4" /></button>
        </li>
      {/each}
    </ul>
  {/if}
  <button type="button" class="button button-quiet" onclick={() => ((search = ""), (open = true))}><Plus class="size-4" />Add a language</button>
</section>

<Dialog bind:open class="max-w-md">
  <div class="p-6">
    <h2 class="text-[20px] font-semibold">Add a language</h2>
    <input bind:value={search} placeholder="Search" aria-label="Search languages" class="field mt-4" />
    <ul class="mt-3 max-h-80 overflow-y-auto">
      {#each offered as lang (lang)}
        <li>
          <button type="button" class="-mx-2 flex w-[calc(100%+1rem)] justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-well" onclick={() => { void save([...mine, lang]); open = false }}>
            <span>{nativeName(lang)}</span><span class="text-ink-muted">{englishName(lang)}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</Dialog>
