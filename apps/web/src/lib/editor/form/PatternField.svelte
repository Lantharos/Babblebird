<script lang="ts">
  import { segments } from "@babblebird/fluent"

  let {
    value = $bindable(""),
    label,
    placeholder = "",
    autofocus = false,
    textarea = $bindable(),
  }: {
    value?: string
    label: string
    placeholder?: string
    autofocus?: boolean
    textarea?: HTMLTextAreaElement
  } = $props()

  const parts = $derived(segments(value))

  $effect(() => {
    if (autofocus && textarea) textarea.focus({ preventScroll: true })
  })
</script>

<div class="field-shell relative rounded-2xl bg-well transition-shadow focus-within:shadow-[0_0_0_2px_var(--accent)]">
  <div aria-hidden="true" class="pattern pointer-events-none text-transparent">
    {#each parts as part}{#if part.placeable}<mark class="rounded-md bg-accent/16 text-transparent">{part.text}</mark>{:else}{part.text}{/if}{/each}&#8203;
  </div>
  <textarea
    bind:this={textarea}
    bind:value
    aria-label={label}
    {placeholder}
    rows="1"
    spellcheck="true"
    class="pattern absolute inset-0 resize-none overflow-hidden bg-transparent text-ink outline-none placeholder:text-ink-muted"
  ></textarea>
</div>

<style>
  .pattern {
    display: block;
    width: 100%;
    min-height: 3rem;
    padding: 0.75rem 1rem;
    font-size: 17px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: inherit;
  }
</style>
