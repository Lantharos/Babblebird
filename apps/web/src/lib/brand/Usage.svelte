<script lang="ts">
  import Check from "@lucide/svelte/icons/check"
  import X from "@lucide/svelte/icons/x"
  import { file } from "./brand.ts"

  const examples = [
    { good: true, text: "Give it room: clear space on every side of at least half its height.", style: "" },
    {
      good: false,
      text: "Don’t stretch, squash or rotate it, or redraw the bird.",
      style: "scale: 1.55 0.8",
    },
    {
      good: false,
      text: "Don’t recolour it. The tile stays coral and the bird stays light.",
      style: "filter: hue-rotate(150deg)",
    },
    {
      good: false,
      text: "Don’t add shadows, outlines or glows.",
      style: "filter: drop-shadow(0 6px 4px rgb(0 0 0 / 0.55))",
    },
  ]
</script>

<div class="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
  {#each examples as example}
    <div>
      <div class="grid h-44 place-items-center rounded-[28px] bg-well">
        {#if example.good}
          <span class="rounded-[22px] p-8 outline-2 outline-offset-0 outline-accent/40 outline-dashed">
            <img src={file("icon.svg")} alt="" class="size-16" />
          </span>
        {:else}
          <img src={file("icon.svg")} alt="" class="size-16" style={example.style} />
        {/if}
      </div>
      <p class="mt-4 flex gap-2.5 text-[15px] leading-snug text-ink-soft">
        {#if example.good}
          <Check class="mt-0.5 size-4 shrink-0 text-done" aria-label="Do" />
        {:else}
          <X class="mt-0.5 size-4 shrink-0 text-danger" aria-label="Don’t" />
        {/if}
        <span>{example.text}</span>
      </p>
    </div>
  {/each}
</div>
