<script lang="ts">
  import Search from "@lucide/svelte/icons/search"

  let {
    value = $bindable(""),
    input = $bindable(),
    label,
    placeholder = "Search",
    size = "md",
    class: className = "",
    oninput,
    onblur,
  }: {
    value?: string
    input?: HTMLInputElement
    label: string
    placeholder?: string
    size?: "sm" | "md"
    class?: string
    oninput?: () => void
    onblur?: () => void
  } = $props()
</script>

<label class="relative block {className}">
  <Search class="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-ink-muted {size === 'sm' ? 'left-3' : 'left-3.5'}" />
  <input
    bind:this={input}
    bind:value
    {placeholder}
    aria-label={label}
    {oninput}
    {onblur}
    class="field {size === 'sm' ? 'h-9 pl-9 text-body' : 'pl-10'}"
  />
</label>
