<script lang="ts">
  import { wordDiff } from "./diff.ts"

  let { before, after }: { before: string; after: string } = $props()

  const plain = (body: string) => body.replace(/^=\s*/, "")
  const parts = $derived(wordDiff(plain(before), plain(after)))
</script>

<p class="text-body text-ink-soft">
  <span class="text-caution">Changed since it was translated:</span>
  {#each parts as part}{#if part.kind === "removed"}<del class="text-ink-muted decoration-danger/70">{part.text}</del>{:else if part.kind === "added"}<ins class="rounded bg-caution/15 px-0.5 text-ink no-underline">{part.text}</ins>{:else}{part.text}{/if}{/each}
</p>
