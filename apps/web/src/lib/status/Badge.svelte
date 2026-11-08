<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import Copy from "@lucide/svelte/icons/copy"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  let { project }: { project: Project } = $props()
  const image = $derived(`${location.origin}/api/badge/${project.slug}.svg`)
  const markdown = $derived(`[![Translations](${image})](${location.origin}/p/${project.slug})`)

  async function copy() {
    await navigator.clipboard.writeText(markdown)
    toasts.show("Copied")
  }
</script>

<section>
  <h2 class="text-[22px] font-semibold tracking-[-0.02em]">Badge</h2>
  <p class="mt-1 text-[15px] text-ink-soft">Show how far the translations have come in your README. Add <code class="font-mono text-[13px]">?lang=de</code> for one language.</p>
  <img src={image} alt="" class="mt-4 h-5" />
  <div class="mt-3 flex items-center gap-2 rounded-2xl bg-well py-2 pr-2 pl-4">
    <code class="min-w-0 flex-1 truncate font-mono text-[13px]">{markdown}</code>
    <button type="button" class="button button-sm button-quiet" onclick={copy}><Copy class="size-4" />Copy</button>
  </div>
</section>
