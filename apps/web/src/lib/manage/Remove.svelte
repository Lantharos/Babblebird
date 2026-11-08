<script lang="ts">
  import type { Project } from "@babblebird/protocol"
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

<section>
  <h2 class="text-[22px] font-semibold tracking-[-0.02em]">Remove the project</h2>
  <p class="mt-2 max-w-xl text-[15px] text-ink-soft">
    Translators can’t open it any more and nothing is sent to the repository. Adding the repository again on GitHub brings it back.
  </p>
  <button type="button" class="button button-danger mt-4" onclick={() => (asking = true)}>Remove {project.name}</button>
</section>

<Dialog bind:open={asking}>
  <div class="p-6">
    <h2 class="text-[20px] font-semibold">Remove {project.owner}/{project.name}?</h2>
    <p class="mt-2 text-[15px] leading-relaxed text-ink-soft">
      Its translators lose access right away. To stop Babblebird reading the repository too, remove it from the app’s settings on GitHub.
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="button button-quiet" data-dismiss onclick={() => (asking = false)}>Keep it</button>
      <button type="button" class="button button-danger" onclick={remove}>Remove</button>
    </div>
  </div>
</Dialog>
