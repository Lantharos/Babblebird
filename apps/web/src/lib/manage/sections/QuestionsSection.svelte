<script lang="ts">
  import type { Project, Question } from "@babblebird/protocol"
  import { resource } from "#lib/api/resource.svelte.ts"
  import { when } from "#lib/format/time.ts"
  import { projectPath } from "#lib/projects/project.svelte.ts"
  import Section from "./Section.svelte"

  let { project }: { project: Project } = $props()
  const questions = $derived(resource<Question[]>(`${projectPath(project.owner, project.name)}/questions`))
  const lang = $derived(project.languages[0]?.lang)
</script>

<Section title="Questions about the English" text="What translators asked about strings, until someone resolves it.">
  {#if questions.data?.length && lang}
    <ul class="space-y-1">
      {#each questions.data as question (question.id)}
        <li>
          <a href="/p/{project.owner}/{project.name}/{lang}/{question.area}?string={question.id}" class="-mx-3 block rounded-xl px-3 py-2 transition-colors hover:bg-well/60">
            <span class="block font-mono text-small text-ink-soft">{question.key}</span>
            <span class="block truncate text-body">{question.last.body}</span>
            <span class="block text-small text-ink-muted">{question.last.by?.name ?? "Someone"} · {when(question.last.at)}{question.comments > 1 ? ` · ${question.comments} comments` : ""}</span>
          </a>
        </li>
      {/each}
    </ul>
  {:else if questions.data}
    <p class="text-body text-ink-muted">No open questions.</p>
  {:else}
    <div class="placeholder h-16"></div>
  {/if}
</Section>
