<script lang="ts">
  import type { Thread } from "@babblebird/protocol"
  import LoaderCircle from "@lucide/svelte/icons/loader-circle"
  import { getSession } from "#lib/api/session.svelte.ts"
  import type { Detail, Editor } from "#lib/editor/editor.svelte.ts"
  import { nativeName } from "#lib/format/languages.ts"
  import { when } from "#lib/format/time.ts"
  import Avatar from "#lib/ui/Avatar.svelte"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  let { detail, editor, canClose }: { detail: Detail; editor: Editor; canClose: boolean } = $props()

  const session = getSession()
  let body = $state("")
  let about = $state<"lang" | "english">("lang")
  let busy = $state(false)

  const threads = $derived([...detail.discussion].sort((a, b) => Number(a.english) - Number(b.english)))

  async function run(action: () => Promise<void>) {
    busy = true
    await action().catch(toasts.error)
    busy = false
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!body.trim()) return
    void run(async () => {
      await editor.comment(body.trim(), about === "english")
      body = ""
    })
  }

  const label = (thread: Thread) => (thread.english ? "About the English" : nativeName(editor.lang))
</script>

<section>
  <h2 class="mb-3 font-semibold">Discussion</h2>
  <div class="space-y-6">
    {#each threads as thread (thread.english)}
      <div class="space-y-3 {thread.resolved ? 'opacity-60' : ''}">
        <p class="flex items-baseline justify-between gap-3 text-small text-ink-muted">
          <span>{label(thread)}{thread.resolved ? " · resolved" : ""}</span>
          {#if canClose}
            <button type="button" class="link" disabled={busy} onclick={() => run(() => editor.resolve(thread.english, !thread.resolved))}>{thread.resolved ? "Reopen" : "Resolve"}</button>
          {/if}
        </p>
        {#each thread.comments as comment (comment.id)}
          <div class="flex gap-2.5">
            <Avatar name={comment.by?.name ?? "?"} image={comment.by?.image ?? null} />
            <div class="min-w-0">
              <p class="text-small"><span class="font-medium">{comment.by?.name ?? "Someone"}</span> <span class="text-ink-muted">{when(comment.at)}</span></p>
              <p class="break-words whitespace-pre-wrap">{comment.body}</p>
            </div>
          </div>
        {/each}
      </div>
    {/each}
    {#if session.me}
      <form class="space-y-2" onsubmit={submit}>
        <textarea bind:value={body} rows="2" maxlength="4000" class="field h-auto resize-y py-2.5" placeholder="Ask or note something" aria-label="Comment"></textarea>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <Segmented bind:value={about} label="About" size="sm" options={[{ value: "lang", label: nativeName(editor.lang) }, { value: "english", label: "The English" }]} />
          <button class="button button-sm button-quiet" disabled={busy || !body.trim()}>
            {#if busy}<LoaderCircle class="size-4 animate-spin" />{/if}
            Comment
          </button>
        </div>
      </form>
    {:else if !threads.length}
      <p class="text-ink-muted">No discussion yet.</p>
    {/if}
  </div>
</section>
