<script lang="ts">
  import { INSTALL_URL, type Project } from "@babblebird/protocol"
  import { api } from "#lib/api/client.ts"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import { goto } from "$app/navigation"

  let { project }: { project: Project } = $props()
  let asking = $state(false)

  async function remove() {
    try {
      await api.delete(`/projects/${project.slug}`)
      await goto("/dashboard")
    } catch (error) {
      toasts.error(error)
    }
  }
</script>

<section class="mt-16 border-t border-hairline pt-10 text-[15px] text-ink-soft">
  <p>
    If Babblebird was removed from {project.name} on GitHub, <a href={INSTALL_URL} class="link">add it again</a> to reconnect. Translations made here are kept.
  </p>
  <p class="mt-3">
    <button type="button" class="font-medium text-danger hover:underline" onclick={() => (asking = true)}>Remove {project.name} from Babblebird</button>
  </p>
</section>

<Dialog bind:open={asking}>
  <div class="p-6">
    <h2 class="text-[20px] font-semibold">Remove {project.owner}/{project.name}?</h2>
    <p class="mt-2 text-[15px] leading-relaxed text-ink-soft">
      Translators lose access right away and nothing more is sent to the repository. To stop Babblebird reading it too, remove the repository from the app’s settings on GitHub.
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="button button-quiet" data-dismiss onclick={() => (asking = false)}>Keep it</button>
      <button type="button" class="button button-danger" onclick={remove}>Remove</button>
    </div>
  </div>
</Dialog>
