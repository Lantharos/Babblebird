<script lang="ts">
  import { segments } from "@babblebird/fluent"
  import type { GlossaryEntry } from "@babblebird/protocol"

  let { text, glossary = [] }: { text: string; glossary?: GlossaryEntry[] } = $props()

  const escaped = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const terms = $derived(
    glossary.length
      ? new RegExp(
          `(?<![\\p{L}\\p{N}])(${glossary.map((entry) => escaped(entry.term)).join("|")})(?![\\p{L}\\p{N}])`,
          "giu",
        )
      : null,
  )
  const noteOf = (word: string) => {
    const entry = glossary.find((candidate) => candidate.term.toLowerCase() === word.toLowerCase())
    return entry ? (entry.translation === null ? "Keep as it is" : `Usually “${entry.translation}”`) : ""
  }

  function pieces(part: string) {
    if (!terms) return [{ text: part, term: false }]
    return part.split(terms).map((piece, index) => ({ text: piece, term: index % 2 === 1 }))
  }
</script>

<span class="whitespace-pre-wrap">{#each segments(text) as part}{#if part.placeable}<span class="mono-placeable px-1">{part.text}</span>{:else}{#each pieces(part.text) as piece}{#if piece.term}<span class="underline decoration-beak decoration-2 underline-offset-4" title={noteOf(piece.text)}>{piece.text}</span>{:else}{piece.text}{/if}{/each}{/if}{/each}</span>
