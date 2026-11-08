<script lang="ts" generics="T extends string">
  let {
    value = $bindable(),
    options,
    label,
  }: { value: T; options: { value: T; label: string; text: string }[]; label: string } = $props()

  function keydown(event: KeyboardEvent) {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const index = options.findIndex((option) => option.value === value)
    const next = options[(index + step + options.length) % options.length]!
    value = next.value
    ;(event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus()
  }
</script>

<div role="radiogroup" aria-label={label} tabindex="-1" class="space-y-2" onkeydown={keydown}>
  {#each options as option (option.value)}
    {@const chosen = option.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      data-value={option.value}
      tabindex={chosen ? 0 : -1}
      onclick={() => (value = option.value)}
      class="flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors {chosen ? 'bg-well' : 'hover:bg-well/60'}"
    >
      <span class="mt-1 grid size-[18px] shrink-0 place-items-center rounded-full ring-2 {chosen ? 'ring-accent' : 'ring-ink-muted/50'}">
        {#if chosen}<span class="size-2 rounded-full bg-accent"></span>{/if}
      </span>
      <span>
        <span class="block text-[16px] font-medium">{option.label}</span>
        <span class="mt-0.5 block text-[14px] leading-relaxed text-ink-soft">{option.text}</span>
      </span>
    </button>
  {/each}
</div>
