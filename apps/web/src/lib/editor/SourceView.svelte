<script lang="ts">
  import type { Shape } from "@babblebird/fluent"
  import type { GlossaryEntry } from "@babblebird/protocol"
  import Highlighted from "./Highlighted.svelte"
  import { variantLabel } from "./plural.ts"

  let { shape, sourceLang, glossary }: { shape: Shape; sourceLang: string; glossary: GlossaryEntry[] } =
    $props()
</script>

<div class="space-y-4">
  {#each shape.fields as field}
    <div>
      {#if field.name !== null}<p class="font-mono text-[13px] text-ink-muted">.{field.name}</p>{/if}
      {#if field.part.kind === "text"}
        <p class="text-[19px] leading-relaxed"><Highlighted text={field.part.text} {glossary} /></p>
      {:else}
        <dl class="space-y-2">
          {#each field.part.variants as variant}
            {@const label = variantLabel(sourceLang, variant.key)}
            <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
              <dt class="pt-1 text-[13px] text-ink-muted">{label.name}{#if label.hint}<span class="block tabular">{label.hint}</span>{/if}</dt>
              <dd class="text-[19px] leading-relaxed"><Highlighted text={variant.text} {glossary} /></dd>
            </div>
          {/each}
        </dl>
      {/if}
    </div>
  {/each}
</div>
