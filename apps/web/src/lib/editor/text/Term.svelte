<script lang="ts">
  import Popover from "#lib/ui/overlay/Popover.svelte"

  let { text, note }: { text: string; note: string } = $props()
  const id = $props.id()
  let anchor = $state<HTMLButtonElement>()
  let open = $state(false)

  const hover = (event: PointerEvent, next: boolean) => {
    if (event.pointerType === "mouse") open = next
  }
</script>

<button
  bind:this={anchor}
  type="button"
  aria-describedby={open ? id : undefined}
  class="cursor-help underline decoration-beak decoration-2 underline-offset-4"
  onpointerenter={(event) => hover(event, true)}
  onpointerleave={(event) => hover(event, false)}
  onfocus={() => (open = true)}
  onblur={() => (open = false)}
  onclick={() => (open = true)}>{text}</button
><Popover bind:open {anchor} placement="top-start" class="pointer-events-none max-w-64 px-3 py-2 text-small text-ink-soft"
  ><span {id} role="tooltip">{note}</span></Popover
>
