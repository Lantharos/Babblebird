<script lang="ts">
  import type { Problem } from "@babblebird/fluent"

  let { problems }: { problems: Problem[] } = $props()
</script>

{#if problems.length}
  <ul class="space-y-1.5 text-[15px]" aria-live="polite">
    {#each problems as problem}
      <li class="flex items-start gap-2.5">
        <span class="mt-2 size-1.5 shrink-0 rounded-full {problem.severity === 'error' ? 'bg-danger' : 'bg-caution'}"></span>
        <span class={problem.severity === "error" ? "text-danger" : "text-ink-soft"}>{problem.text}</span>
      </li>
    {/each}
  </ul>
{/if}
