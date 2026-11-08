<script lang="ts">
  import type { Snippet } from "svelte"
  import Bird from "../Bird.svelte"

  let { side = "left", children }: { side?: "left" | "right"; children: Snippet } = $props()
</script>

<div class="mb-10 w-fit max-w-md {side === 'left' ? 'ml-13' : 'mr-13 lg:ml-auto'}">
  <p class="relative rounded-[26px] bg-raised px-6 py-5 text-[20px] leading-snug ring-1 ring-hairline {side === 'left' ? 'rounded-bl-none' : 'rounded-br-none'}">
    {@render children()}
    <span class="speaker {side}" aria-hidden="true"><Bird class="size-full" /></span>
  </p>
</div>

<style>
  .speaker {
    --width: 56px;
    --height: calc(var(--width) * 38 / 44);
    --tip-x: calc(var(--width) * 42 / 44);
    --tip-y: calc(var(--height) * 17.6 / 38);
    position: absolute;
    width: var(--width);
    height: var(--height);
    top: calc(100% - var(--tip-y));
    transform-origin: var(--tip-x) var(--tip-y);
  }

  .left {
    left: calc(0px - var(--tip-x));
    rotate: -38deg;
  }

  .right {
    left: calc(100% - var(--tip-x));
    transform: rotate(38deg) scaleX(-1);
  }
</style>
