<script lang="ts">
  import Placeable from "#lib/landing/Placeable.svelte"

  const forms = [
    { key: "one", hint: "1, 21, 31…", word: "sat" },
    { key: "few", hint: "2, 3, 4, 22…", word: "sata" },
    { key: "other", hint: "0, 5, 6, 11…", word: "sati" },
  ]
  const previews = [
    { count: 1, word: "sat" },
    { count: 3, word: "sata" },
    { count: 5, word: "sati" },
  ]
</script>

<div class="rounded-stage bg-raised p-8 ring-1 ring-hairline sm:p-10" aria-hidden="true">
  <p class="text-[22px]"><Placeable text="$count" /> hours left</p>
  <div class="mt-8 space-y-3">
    {#each forms as form, index}
      <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4">
        <p class="text-[14px] leading-tight text-ink-muted"><span class="block font-medium text-ink-soft">{form.key}</span>{form.hint}</p>
        <p class="rounded-2xl bg-well px-4 py-2.5 text-[18px] {index === 1 ? 'shadow-[0_0_0_2px_var(--accent)]' : ''}" lang="hr">
          Još <Placeable text="$count" /> {form.word}
        </p>
      </div>
    {/each}
  </div>
  <p class="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-hairline pt-6 text-[16px]">
    {#each previews as preview}
      <span lang="hr"><span class="text-ink-muted">With {preview.count}</span> Još {preview.count} {preview.word}</span>
    {/each}
  </p>
</div>
