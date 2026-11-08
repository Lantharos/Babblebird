<script lang="ts">
  import Kbd from "#lib/ui/Kbd.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"

  let { open = $bindable(false) }: { open?: boolean } = $props()

  const keys = [
    ["mod+↵", "Save and go to the next string"],
    ["mod+⇧+↵", "Approve and go on, for reviewers"],
    ["alt+↓", "Skip to the next string"],
    ["alt+↑", "Back to the previous string"],
    ["alt+1", "Use the first match from earlier translations"],
    ["alt+I", "Start from the source text"],
    ["/", "Search the strings"],
  ]
</script>

<Dialog bind:open class="max-w-md">
  <div class="p-6">
    <h2 class="text-[20px] font-semibold">Keyboard</h2>
    <dl class="mt-4 space-y-2.5 text-[15px]">
      {#each keys as [combo, text]}
        <div class="flex items-center justify-between gap-4"><dt class="text-ink-soft">{text}</dt><dd><Kbd keys={combo!} /></dd></div>
      {/each}
    </dl>
  </div>
</Dialog>
