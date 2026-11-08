<script lang="ts">
  import type { Project, WhoTranslates } from "@babblebird/protocol"
  import Choices from "#lib/ui/fields/Choices.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import Section from "./Section.svelte"
  import { access, saveSettings } from "./settings.ts"

  let { project, onchange }: { project: Project; onchange: () => void } = $props()
  let open = $state(false)
  let chosen = $state<WhoTranslates>("anyone")
  const current = $derived(access.find((option) => option.value === project.whoTranslates)!)

  async function save() {
    try {
      await saveSettings(project, { whoTranslates: chosen })
      open = false
      onchange()
    } catch (error) {
      toasts.error(error)
    }
  }
</script>

<Section title="Who can translate" text="Reviewers and maintainers can always approve. Everyone signed in can suggest.">
  <p class="text-[16px] font-medium">{current.label}</p>
  <p class="mt-1 max-w-md text-[15px] leading-relaxed text-ink-soft">{current.text}</p>
  <button type="button" class="button button-sm button-quiet mt-4" onclick={() => ((chosen = project.whoTranslates), (open = true))}>Change</button>
</Section>

<Dialog bind:open class="max-w-lg">
  <div class="p-6 sm:p-7">
    <h2 class="text-[20px] font-semibold">Who can translate</h2>
    <div class="mt-5"><Choices bind:value={chosen} options={access} label="Who can translate" /></div>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="button button-quiet" data-dismiss onclick={() => (open = false)}>Cancel</button>
      <button type="button" class="button button-primary" disabled={chosen === project.whoTranslates} onclick={save}>Save</button>
    </div>
  </div>
</Dialog>
