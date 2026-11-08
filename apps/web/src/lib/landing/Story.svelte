<script lang="ts">
  import type { Snippet } from "svelte"

  let {
    title,
    text,
    flip = false,
    children,
  }: { title: string; text: string; flip?: boolean; children: Snippet } = $props()
</script>

<section class="grid items-center gap-x-20 gap-y-10 py-20 md:grid-cols-2 md:py-28">
  <div class={flip ? "md:order-2" : ""}>
    <h2 class="text-[32px] leading-tight font-semibold tracking-[-0.025em] sm:text-[40px]">{title}</h2>
    <p class="mt-5 max-w-md text-[18px] leading-relaxed text-ink-soft">{text}</p>
  </div>
  <div>{@render children()}</div>
</section>
