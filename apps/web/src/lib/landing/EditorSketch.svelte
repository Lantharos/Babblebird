<script lang="ts">
  import Placeable from "./Placeable.svelte"

  const forms = [
    { key: "one", hint: "1, 21, 31…", source: ["Close window"], target: ["Fenster schließen"] },
    {
      key: "other",
      hint: "0, 2, 3…",
      source: ["Close all ", "$count", " windows"],
      target: ["Alle ", "$count", " Fenster schließen"],
    },
  ]
</script>

<div class="rounded-[32px] bg-raised px-6 py-8 ring-1 ring-hairline sm:px-12 sm:py-12" aria-hidden="true">
  <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
    <p class="font-mono text-[14px] text-ink-soft">window-menu-close</p>
    <p class="font-mono text-[13px] text-ink-muted">kestrel/ui/locales/en/desktop.ftl</p>
  </div>
  <p class="mt-3 max-w-xl text-[15px] text-ink-muted">Window menu on the taskbar, closes every window of the app</p>

  <div class="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
    <p class="text-[13px] font-medium text-ink-muted max-md:hidden">English</p>
    <p class="text-[13px] font-medium text-ink-muted max-md:hidden">Deutsch</p>
    {#each forms as form, index}
      <div>
        <p class="text-[13px] text-ink-muted"><span class="font-medium text-ink-soft">{form.key}</span> · {form.hint}</p>
        <p class="mt-1.5 text-[20px]">{#each form.source as part}{#if part.startsWith("$")}<Placeable text={part} />{:else}{part}{/if}{/each}</p>
      </div>
      <div>
        <p class="text-[13px] text-ink-muted md:invisible"><span class="font-medium text-ink-soft">{form.key}</span> · Deutsch</p>
        <p class="mt-1.5 rounded-2xl bg-well px-4 py-2.5 text-[20px] {index === 1 ? 'shadow-[0_0_0_2px_var(--accent)]' : ''}">
          {#each form.target as part}{#if part.startsWith("$")}<Placeable text={part} />{:else}{part}{/if}{/each}{#if index === 1}<span class="caret ml-px inline-block h-5 w-px translate-y-0.5 bg-ink"></span>{/if}
        </p>
      </div>
    {/each}
  </div>

  <div class="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t border-hairline pt-6 text-[15px]">
    <p><span class="text-ink-muted">With 1</span> Fenster schließen</p>
    <p><span class="text-ink-muted">With 3</span> Alle 3 Fenster schließen</p>
    <p class="flex items-center gap-2 text-ink-soft sm:ml-auto"><span class="size-1.5 rounded-full bg-done"></span>Placeables match the English</p>
  </div>
</div>

<style>
  @media (prefers-reduced-motion: no-preference) {
    .caret {
      animation: blink 1.1s steps(1) infinite;
    }
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
