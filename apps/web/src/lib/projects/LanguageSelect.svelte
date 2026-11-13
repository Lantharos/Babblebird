<script lang="ts">
  import { englishName, nativeName } from "#lib/format/languages.ts"
  import Select from "#lib/ui/fields/Select.svelte"

  let {
    value,
    languages,
    onchange,
  }: { value: string | null; languages: string[]; onchange: (lang: string) => void } = $props()

  const options = $derived(
    languages
      .map((lang) => ({
        value: lang,
        label:
          nativeName(lang) === englishName(lang)
            ? nativeName(lang)
            : `${nativeName(lang)} · ${englishName(lang)}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  )
</script>

<Select value={value ?? undefined} {options} label="Your language" placeholder="Choose your language" {onchange} />
