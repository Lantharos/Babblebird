<script lang="ts">
  import type { Project } from "@babblebird/protocol"
  import Copy from "@lucide/svelte/icons/copy"
  import { copy } from "#lib/ui/copy.ts"
  import { page } from "$app/state"

  let { project }: { project: Project } = $props()
  const image = $derived(`${page.url.origin}/api/badge/${project.slug}.svg`)
  const markdown = $derived(`[![Translations](${image})](${page.url.origin}/p/${project.slug})`)
</script>

<section>
  <h2 class="text-[22px] font-semibold tracking-[-0.02em]">README badge</h2>
  <p class="mt-1 text-body text-ink-soft">Add <code class="font-mono text-small">?lang=de</code> for a single language.</p>
  <img src={image} alt="" class="mt-4 h-5" />
  <div class="mt-3 flex items-center gap-2 rounded-2xl bg-well py-2 pr-2 pl-4">
    <code class="min-w-0 flex-1 truncate font-mono text-small">{markdown}</code>
    <button type="button" class="button button-sm button-quiet" onclick={() => copy(markdown)}><Copy class="size-4" />Copy</button>
  </div>
</section>
