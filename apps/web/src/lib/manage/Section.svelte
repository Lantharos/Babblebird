<script lang="ts">
  import type { Snippet } from "svelte"

  let { title, text, children }: { title: string; text: string; children: Snippet } = $props()
</script>

<section class="grid gap-x-12 gap-y-4 border-t border-hairline py-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
  <div>
    <h2 class="text-[19px] font-semibold tracking-[-0.015em]">{title}</h2>
    <p class="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{text}</p>
  </div>
  <div class="md:pt-0.5">{@render children()}</div>
</section>
