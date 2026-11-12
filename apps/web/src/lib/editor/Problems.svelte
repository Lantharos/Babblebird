<script lang="ts">
  import type { Problem } from "@babblebird/fluent"

  let { problems, hints }: { problems: Problem[]; hints: string[] } = $props()
</script>

{#if problems.length || hints.length}
  <ul class="space-y-1.5 text-[15px]" aria-live="polite">
    {#each problems as problem}
      <li class="flex items-start gap-2.5">
        <span class="mt-2 size-1.5 shrink-0 rounded-full {problem.severity === 'error' ? 'bg-danger' : 'bg-caution'}"></span>
        <span class={problem.severity === "error" ? "text-danger" : "text-ink-soft"}>{problem.text}</span>
      </li>
    {/each}
    {#each hints as hint}
      <li class="flex items-start gap-2.5 text-ink-muted">
        <span class="mt-2 size-1.5 shrink-0 rounded-full ring-1 ring-inset ring-ink-muted/60"></span>
        <span>{hint}</span>
      </li>
    {/each}
  </ul>
{/if}
