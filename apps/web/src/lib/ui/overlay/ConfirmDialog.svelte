<script lang="ts">
  import LoaderCircle from "@lucide/svelte/icons/loader-circle"
  import Dialog from "./Dialog.svelte"
  import { toasts } from "./toasts.svelte.ts"

  let {
    open = $bindable(false),
    title,
    text,
    confirm,
    cancel = "Cancel",
    tone = "danger",
    onconfirm,
  }: {
    open?: boolean
    title: string
    text: string
    confirm: string
    cancel?: string
    tone?: "danger" | "primary"
    onconfirm: () => Promise<unknown>
  } = $props()

  let busy = $state(false)

  async function run() {
    busy = true
    try {
      await onconfirm()
      open = false
    } catch (error) {
      toasts.error(error)
    }
    busy = false
  }
</script>

<Dialog bind:open>
  <h2 class="text-[20px] font-semibold">{title}</h2>
  <p class="mt-2 text-body leading-relaxed text-ink-soft">{text}</p>
  {#snippet actions()}
    <button type="button" class="button button-quiet" data-dismiss disabled={busy} onclick={() => (open = false)}>{cancel}</button>
    <button type="button" class="button {tone === 'danger' ? 'button-danger' : 'button-primary'}" disabled={busy} onclick={run}>
      {#if busy}<LoaderCircle class="size-4 animate-spin" />{/if}
      {confirm}
    </button>
  {/snippet}
</Dialog>
