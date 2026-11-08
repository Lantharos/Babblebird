<script lang="ts">
  import type { Snippet } from "svelte"
  import Bird from "../Bird.svelte"

  let { side = "left", children }: { side?: "left" | "right"; children: Snippet } = $props()
</script>

<div class="relative w-fit {side === 'left' ? 'pl-12' : 'pr-12 lg:ml-auto'}">
  <p class="max-w-md rounded-[26px] bg-raised px-6 py-5 text-[20px] leading-snug ring-1 ring-hairline {side === 'left' ? 'rounded-bl-[6px]' : 'rounded-br-[6px]'}">
    {@render children()}
  </p>
  <span class="absolute -bottom-3 {side === 'left' ? 'left-0 -rotate-[28deg]' : 'right-0 -scale-x-100 -rotate-[28deg]'}" aria-hidden="true">
    <Bird class="h-10 w-12" />
  </span>
</div>
