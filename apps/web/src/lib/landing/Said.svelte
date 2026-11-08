<script lang="ts">
  import type { Snippet } from "svelte"
  import Bird from "../Bird.svelte"

  let { children }: { children: Snippet } = $props()
</script>

<div class="flex items-end gap-3">
  <Bird class="mb-1 h-9 w-11" />
  <p class="max-w-md rounded-[26px] rounded-bl-[8px] bg-raised px-6 py-5 text-[20px] leading-snug ring-1 ring-hairline">{@render children()}</p>
</div>
