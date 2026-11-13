<script lang="ts">
  import { INSTALL_URL, type Project } from "@babblebird/protocol"
  import { api } from "#lib/api/client.ts"
  import ConfirmDialog from "#lib/ui/overlay/ConfirmDialog.svelte"
  import { goto } from "$app/navigation"

  let { project }: { project: Project } = $props()
  let asking = $state(false)

  async function remove() {
    await api.delete(`/projects/${project.slug}`)
    await goto("/dashboard")
  }
</script>

<section class="mt-16 space-y-3 text-body text-ink-soft">
  <p>Disconnected on GitHub? <a href={INSTALL_URL} class="link">Add it again</a> to reconnect.</p>
  <button type="button" class="link block font-medium text-danger" onclick={() => (asking = true)}>Remove {project.name} from Babblebird</button>
</section>

<ConfirmDialog
  bind:open={asking}
  title="Remove {project.owner}/{project.name}?"
  text="Translators lose access right away and nothing more is sent to the repository. To stop Babblebird reading it too, remove the repository from the app’s settings on GitHub."
  confirm="Remove"
  cancel="Keep it"
  onconfirm={remove}
/>
