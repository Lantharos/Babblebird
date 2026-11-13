<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import { api } from "#lib/api/client.ts"
  import { nativeName } from "#lib/format/languages.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Select from "#lib/ui/fields/Select.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import Section from "./Section.svelte"

  let { project }: { project: Project } = $props()
  let open = $state(false)
  let lang = $state("all")
  let subject = $state("")
  let body = $state("")
  let sending = $state(false)

  const options = $derived([
    { value: "all", label: "Everyone translating" },
    ...project.languages.map((language) => ({ value: language.lang, label: nativeName(language.lang) })),
  ])

  async function send() {
    sending = true
    try {
      const { recipients } = await api.post<{ recipients: number }>(
        `${projectPath(project.owner, project.name)}/announcements`,
        { subject: subject.trim(), body: body.trim(), lang: lang === "all" ? null : lang },
      )
      toasts.show(recipients === 1 ? "On its way to 1 translator" : `On its way to ${recipients} translators`)
      open = false
      subject = ""
      body = ""
    } catch (error) {
      toasts.error(error)
    }
    sending = false
  }
</script>

<Section title="Write to translators" text="An email to everyone translating this project, or to one language.">
  <button type="button" class="button button-sm button-quiet" onclick={() => (open = true)}>Write</button>
</Section>

<Dialog bind:open class="max-w-lg">
  <h2 class="text-[20px] font-semibold">Write to translators</h2>
  <div class="mt-5 space-y-3">
    <Select bind:value={lang} {options} label="Who gets it" />
    <input bind:value={subject} class="field" maxlength="150" placeholder="Subject" aria-label="Subject" />
    <textarea bind:value={body} rows="6" maxlength="5000" class="field h-auto resize-y py-2.5" placeholder="Message" aria-label="Message"></textarea>
  </div>
  {#snippet actions()}
    <button type="button" class="button button-quiet" data-dismiss onclick={() => (open = false)}>Cancel</button>
    <button type="button" class="button button-primary" disabled={sending || !subject.trim() || !body.trim()} onclick={send}>Send</button>
  {/snippet}
</Dialog>
