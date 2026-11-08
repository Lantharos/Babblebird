<script lang="ts">
  import Placeable from "./Placeable.svelte"

  const forms = [
    { key: "one", hint: "1, 21, 31…", text: "файл" },
    { key: "few", hint: "2, 3, 4, 22…", text: "файла" },
    { key: "many", hint: "0, 5, 6, 11…", text: "файлов" },
    { key: "other", hint: "1.5, 2.7…", text: "файла" },
  ]
</script>

<div class="rounded-[32px] bg-raised p-8 ring-1 ring-hairline sm:p-10" aria-hidden="true">
  <p class="text-[22px]">Copied <Placeable text="$count" /> files</p>
  <div class="mt-8 space-y-3">
    {#each forms as form, index}
      <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4">
        <p class="text-[14px] leading-tight text-ink-muted"><span class="block font-medium text-ink-soft">{form.key}</span>{form.hint}</p>
        <p class="rounded-2xl bg-well px-4 py-2.5 text-[18px] {index === 2 ? 'shadow-[0_0_0_2px_var(--accent)]' : ''}" lang="ru">
          Скопировано <Placeable text="$count" /> {form.text}
        </p>
      </div>
    {/each}
  </div>
  <p class="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-hairline pt-6 text-[16px]">
    <span lang="ru"><span class="text-ink-muted">With 22</span> Скопировано 22 файла</span>
    <span lang="ru"><span class="text-ink-muted">With 5</span> Скопировано 5 файлов</span>
  </p>
</div>
