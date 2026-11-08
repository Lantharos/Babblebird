<script lang="ts">
  import type { Delivery, Project, WhoTranslates } from "@babblebird/protocol"
  import { api } from "#lib/api/client.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import Dialog from "#lib/ui/overlay/Dialog.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  let { project, onchange }: { project: Project; onchange: () => void } = $props()
  let asking = $state<Delivery | null>(null)

  const deliveries: { value: Delivery; label: string }[] = [
    { value: "off", label: "Don’t send" },
    { value: "branch", label: "After checks" },
    { value: "direct", label: "Straight in" },
  ]
  const explained: Record<Delivery, string> = {
    off: "Babblebird reads the repository but never writes to it. Translations made here stay here until you turn sending on.",
    branch:
      "Translations go to a babblebird/translations branch in small batches, with a pull request that merges itself once the repository’s checks pass.",
    direct:
      "Translations are committed straight to the default branch in small batches. If the branch is protected, they go through the translations branch instead.",
  }
  const who: { value: WhoTranslates; label: string }[] = [
    { value: "anyone", label: "Anyone signed in" },
    { value: "members", label: "Members only" },
  ]

  async function save(changes: Partial<Pick<Project, "delivery" | "whoTranslates">>) {
    await api.patch(`${projectPath(project.owner, project.name)}/settings`, changes).catch(toasts.error)
    onchange()
  }

  function chooseDelivery(next: Delivery) {
    if (project.delivery === "off" && next !== "off") asking = next
    else void save({ delivery: next })
  }
</script>

<section class="space-y-8">
  <div>
    <h2 class="text-[22px] font-semibold tracking-[-0.02em]">Sending translations back</h2>
    <div class="mt-3"><Segmented value={project.delivery} options={deliveries} label="Sending translations" onchange={chooseDelivery} /></div>
    <p class="mt-3 max-w-xl text-[15px] text-ink-soft">{explained[project.delivery]}</p>
  </div>
  <div>
    <h2 class="text-[22px] font-semibold tracking-[-0.02em]">Who can translate</h2>
    <div class="mt-3"><Segmented value={project.whoTranslates} options={who} label="Who can translate" onchange={(next) => save({ whoTranslates: next })} /></div>
    <p class="mt-3 max-w-xl text-[15px] text-ink-soft">
      {project.whoTranslates === "anyone" ? "Anyone with an account can translate. Reviewers you add can approve." : "Only members you add can translate. Everyone else can still suggest."}
    </p>
  </div>
</section>

<Dialog open={asking !== null} onclose={() => (asking = null)}>
  <div class="p-6">
    <h2 class="text-[20px] font-semibold">Start sending translations?</h2>
    <p class="mt-2 text-[15px] leading-relaxed text-ink-soft">
      From now on Babblebird writes to {project.owner}/{project.name}. If another tool, like Weblate, also edits these files, turn it off first,
      or the two will keep overwriting each other. Everything translated here so far goes out in the first batch.
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="button button-quiet" data-dismiss onclick={() => (asking = null)}>Not yet</button>
      <button type="button" class="button button-primary" onclick={() => { void save({ delivery: asking! }); asking = null }}>Start sending</button>
    </div>
  </div>
</Dialog>
