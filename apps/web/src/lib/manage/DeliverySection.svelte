<script lang="ts">
  import type { Delivery, DeliveryStatus, Project } from "@babblebird/protocol"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Choices from "#lib/ui/fields/Choices.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import Section from "./Section.svelte"
  import { deliveries, saveSettings } from "./settings.ts"

  let { project, onchange }: { project: Project; onchange: () => void } = $props()
  const status = $derived(resource<DeliveryStatus>(`${projectPath(project.owner, project.name)}/delivery`))
  let open = $state(false)
  let chosen = $state<Delivery>("off")
  const current = $derived(deliveries.find((option) => option.value === project.delivery)!)
  const startsSending = $derived(project.delivery === "off" && chosen !== "off")

  function pullState(checks: DeliveryStatus["checks"]) {
    if (checks === "failed") return "failed the repository’s checks"
    if (project.delivery !== "pull") return "is waiting for the checks"
    return checks === "passed" ? "passed the checks and is ready to merge" : "is open for you to merge"
  }

  function edit() {
    chosen = project.delivery
    open = true
  }

  async function save() {
    try {
      await saveSettings(project, { delivery: chosen })
      open = false
      onchange()
    } catch (error) {
      toasts.error(error)
    }
  }
</script>

<Section title="Sending translations back" text="How translations made here reach {project.name}.">
  <p class="text-[16px] font-medium">{current.label}</p>
  <p class="mt-1 max-w-md text-[15px] leading-relaxed text-ink-soft">{current.text}</p>
  {#if status.data}
    {@const state = status.data}
    {#if state.problem}
      <p class="mt-3 max-w-md text-[15px] leading-relaxed text-caution">{state.problem}</p>
    {:else if project.delivery !== "off" && state.pullNumber && !state.mergedAt}
      <p class="mt-3 text-[15px] {state.checks === 'failed' ? 'text-caution' : 'text-ink-soft'}">
        <a href="https://github.com/{project.owner}/{project.name}/pull/{state.pullNumber}" class="link">Pull request #{state.pullNumber}</a>
        {pullState(state.checks)}
      </p>
    {:else if state.waitingFiles}
      <p class="mt-3 text-[15px] text-ink-soft">
        {state.waitingFiles === 1 ? "1 file has" : `${state.waitingFiles} files have`} translations that aren’t in the repository yet{project.delivery !== "off" ? ". They go out after a pause in translating." : "."}
      </p>
    {:else if state.mergedAt}
      <p class="mt-3 text-[15px] text-ink-soft">Everything translated here is in the repository.</p>
    {/if}
  {/if}
  <button type="button" class="button button-sm button-quiet mt-4" onclick={edit}>Change</button>
</Section>

<Dialog bind:open class="max-w-lg">
  <div class="p-6 sm:p-7">
    <h2 class="text-[20px] font-semibold">Sending translations back</h2>
    <div class="mt-5"><Choices bind:value={chosen} options={deliveries} label="Sending translations back" /></div>
    {#if startsSending}
      <p class="mt-5 text-[14px] leading-relaxed text-caution">
        From now on Babblebird writes to {project.owner}/{project.name}. If another tool, like Weblate, also edits these files, turn it off first. Everything translated here so far goes out in the first batch.
      </p>
    {/if}
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="button button-quiet" data-dismiss onclick={() => (open = false)}>Cancel</button>
      <button type="button" class="button button-primary" disabled={chosen === project.delivery} onclick={save}>{startsSending ? "Start sending" : "Save"}</button>
    </div>
  </div>
</Dialog>
