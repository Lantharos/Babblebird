<script lang="ts">
  import {
    composeBody,
    fitShape,
    glossaryHints,
    isEmpty,
    placeablesOf,
    previews,
    runChecks,
    type Shape,
    shapeOf,
  } from "@babblebird/fluent"
  import type { Abilities } from "@babblebird/protocol"
  import LoaderCircle from "@lucide/svelte/icons/loader-circle"
  import type { Detail, Editor } from "#lib/editor/editor.svelte.ts"
  import { variantLabel } from "#lib/editor/text/plural.ts"
  import Kbd from "#lib/ui/Kbd.svelte"
  import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"
  import PatternField from "./PatternField.svelte"
  import Problems from "./Problems.svelte"

  let { editor, detail, source, can }: { editor: Editor; detail: Detail; source: Shape; can: Abilities } =
    $props()

  const lang = $derived(editor.lang)
  let shape = $state<Shape>({ fields: [] })
  let busy = $state(false)
  let refused = $state<string | null>(null)
  let form = $state<HTMLElement>()
  let focused: HTMLTextAreaElement | null = null

  $effect.pre(() => {
    const existing = detail.row.translation ? shapeOf(detail.row.translation.body) : null
    shape = fitShape(source, existing, lang)
    refused = null
  })

  const body = $derived(composeBody(shape))
  const empty = $derived(isEmpty(shape))
  const problems = $derived(empty ? [] : runChecks(detail.row.body, body, lang, detail.glossary))
  const hints = $derived(empty ? [] : glossaryHints(detail.row.body, body, detail.glossary))
  const blocked = $derived(empty || problems.some((problem) => problem.severity === "error"))
  const shown = $derived(empty ? [] : previews(body, lang))
  const unchanged = $derived(detail.row.translation?.body === body)
  const chips = $derived(
    [...new Set(placeablesOf(detail.row.body.slice(1)))].filter((chip) => !chip.includes("->")),
  )

  export function use(text: string) {
    shape = fitShape(source, shapeOf(text), lang)
  }

  function insert(text: string) {
    const target = focused ?? form?.querySelector("textarea")
    if (!target) return
    const { selectionStart, selectionEnd, value } = target
    target.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd)
    target.dispatchEvent(new Event("input", { bubbles: true }))
    target.focus()
    target.setSelectionRange(selectionStart + text.length, selectionStart + text.length)
  }

  async function submit(approve: boolean) {
    if (blocked || busy) return
    busy = true
    if (!can.translate) {
      try {
        await editor.suggest(body)
        toasts.show("Your suggestion is in")
      } catch (error) {
        toasts.error(error)
      }
      busy = false
      return
    }
    refused = unchanged && !approve ? null : await editor.save(body, approve && can.review)
    busy = false
    if (!refused) await editor.step(1)
  }

  function keydown(event: KeyboardEvent) {
    const mod = event.metaKey || event.ctrlKey
    if (mod && event.key === "Enter") {
      event.preventDefault()
      void submit(event.shiftKey)
    } else if (event.altKey && /^Digit[1-5]$/.test(event.code)) {
      const match = detail.memory[Number(event.code.slice(5)) - 1]
      if (match) {
        event.preventDefault()
        use(match.body)
      }
    } else if (event.altKey && event.code === "KeyI") {
      event.preventDefault()
      use(detail.row.body)
    }
  }
</script>

<svelte:window onkeydown={keydown} />

<div bind:this={form} class="space-y-5" onfocusin={(event) => (focused = event.target instanceof HTMLTextAreaElement ? event.target : focused)}>
  {#each shape.fields as field, fieldIndex}
    <div class="space-y-2">
      {#if field.name !== null}<p class="font-mono text-small text-ink-muted">.{field.name}</p>{/if}
      {#if field.part.kind === "text"}
        <PatternField bind:value={field.part.text} label={field.name ?? "Translation"} autofocus={fieldIndex === 0} placeholder="Translation" />
      {:else}
        {#each field.part.variants as variant, variantIndex}
          {@const label = variantLabel(lang, variant.key)}
          <div>
            <p class="mb-1 flex gap-2 text-small text-ink-muted">
              <span class="font-medium text-ink-soft">{label.name}</span>{#if label.hint}<span class="tabular">{label.hint}</span>{/if}
            </p>
            <PatternField bind:value={variant.text} label="{field.name ?? 'Translation'}, {label.name}" autofocus={fieldIndex === 0 && variantIndex === 0} />
          </div>
        {/each}
      {/if}
    </div>
  {/each}

  {#if chips.length}
    <div class="flex flex-wrap items-center gap-1.5">
      {#each chips as chip}
        <button type="button" class="mono-placeable px-2 py-1 text-small hover:brightness-110" onclick={() => insert(chip)}>{chip}</button>
      {/each}
    </div>
  {/if}

  <Problems {problems} {hints} />
  {#if refused}<p class="text-body text-danger" role="alert">{refused}</p>{/if}

  {#if shown.length}
    <div class="space-y-1.5 rounded-2xl bg-well/60 px-4 py-3">
      {#each shown as preview}
        <p class="flex gap-3 text-body">
          {#if preview.label || preview.attribute}<span class="w-24 shrink-0 text-ink-muted">{preview.attribute ? `.${preview.attribute}` : ""} {preview.label ?? ""}</span>{/if}
          <span class="whitespace-pre-wrap">{preview.text}</span>
        </p>
      {/each}
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-2">
    <button type="button" class="button button-primary" disabled={blocked || busy} onclick={() => submit(false)}>
      {#if busy}<LoaderCircle class="size-4 animate-spin" />{/if}
      {can.translate ? (unchanged ? "Keep and go on" : "Save and go on") : "Suggest"}
      <Kbd keys="mod+↵" />
    </button>
    {#if can.review}
      <button type="button" class="button button-quiet" disabled={blocked || busy} onclick={() => submit(true)}>
        Approve <Kbd keys="mod+⇧+↵" />
      </button>
    {/if}
    <button type="button" class="button button-quiet" onclick={() => editor.step(1)}>Skip <Kbd keys="alt+↓" /></button>
  </div>
</div>
