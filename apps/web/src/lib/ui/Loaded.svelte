<script lang="ts" generics="T">
  import type { Snippet } from "svelte"

  let {
    data,
    error,
    retry,
    placeholder = "h-40",
    children,
  }: {
    data: T | null | undefined
    error: Error | null | undefined
    retry?: () => unknown
    placeholder?: string
    children: Snippet<[NonNullable<T>]>
  } = $props()
</script>

{#if data != null}
  {@render children(data)}
{:else if error}
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2" role="alert">
    <p class="text-body text-danger">{error.message}</p>
    {#if retry}<button type="button" class="button button-sm button-quiet" onclick={retry}>Try again</button>{/if}
  </div>
{:else}
  <div class="placeholder {placeholder}"></div>
{/if}
