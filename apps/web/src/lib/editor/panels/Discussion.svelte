<script lang="ts">
  import type { Thread } from "@babblebird/protocol"
  import LoaderCircle from "@lucide/svelte/icons/loader-circle"
  import { getSession } from "#lib/api/session.svelte.ts"
  import type { Detail, Editor } from "#lib/editor/editor.svelte.ts"
  import { nativeName } from "#lib/format/languages.ts"
  import { when } from "#lib/format/time.ts"
  import Avatar from "#lib/ui/Avatar.svelte"
  import Segmented from "#lib/ui/fields/Segmented.svelte"
  import { focusOnMount } from "#lib/ui/focus.ts"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

  let { detail, editor, canClose }: { detail: Detail; editor: Editor; canClose: boolean } = $props()

  const session = getSession()
  let body = $state("")
  let about = $state<"lang" | "english">("lang")
  let busy = $state(false)

  const threads = $derived([...detail.discussion].sort((a, b) => Number(a.english) - Number(b.english)))
  const comments = $derived(threads.reduce((sum, thread) => sum + thread.comments.length, 0))
  const active = $derived(threads.some((thread) => !thread.resolved))
  let expanded = $state(false)
  let asking = $state(false)
  const shown = $derived(active || expanded)

  $effect.pre(() => {
    void detail.row.id
    expanded = false
    asking = false
  })

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

  function postOnShortcut(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
    if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  const label = (thread: Thread) => (thread.english ? "About the English" : nativeName(editor.lang))
</script>

{#if !shown}
  {#if threads.length}
    <button type="button" class="text-ink-muted transition-colors hover:text-ink" onclick={() => (expanded = true)}>
      Resolved discussion · {comments === 1 ? "1 comment" : `${comments} comments`}
    </button>
  {:else if session.me}
    <button type="button" class="link" onclick={() => ((expanded = true), (asking = true))}>Ask a question</button>
  {/if}
{:else}
  <section>
    <h2 class="mb-3 flex items-baseline justify-between gap-3 font-semibold">
      Discussion
      {#if !active}<button type="button" class="link text-small font-normal" onclick={() => (expanded = false)}>Hide</button>{/if}
    </h2>
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
          <textarea {@attach asking ? focusOnMount : undefined} onkeydown={postOnShortcut} bind:value={body} rows="2" maxlength="4000" class="field h-auto resize-y py-2.5" placeholder="Ask or note something" aria-label="Comment"></textarea>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <Segmented bind:value={about} label="About" size="sm" options={[{ value: "lang", label: nativeName(editor.lang) }, { value: "english", label: "The English" }]} />
            <button class="button button-sm button-quiet" disabled={busy || !body.trim()}>
              {#if busy}<LoaderCircle class="size-4 animate-spin" />{/if}
              Comment
            </button>
          </div>
        </form>
      {/if}
    </div>
  </section>
{/if}
