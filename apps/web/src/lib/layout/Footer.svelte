<script lang="ts">
  import { onMount } from "svelte"
  import Bird from "../Bird.svelte"
  import Wordmark from "../Wordmark.svelte"

  const GOODBYES = [
    { lang: "sq", text: "Mirupafshim!" },
    { lang: "de", text: "Tschüss!" },
    { lang: "hr", text: "Doviđenja!" },
    { lang: "fr", text: "Salut !" },
    { lang: "it", text: "Ciao!" },
    { lang: "pl", text: "Na razie!" },
    { lang: "pt", text: "Tchau!" },
    { lang: "en", text: "Bye for now!" },
  ]

  let goodbye = $state(GOODBYES[0]!)
  onMount(() => {
    goodbye = GOODBYES[Math.floor(Math.random() * GOODBYES.length)]!
  })

  const links = [
    { href: "/projects", label: "Help translate" },
    { href: "/docs", label: "Docs" },
    { href: "/brand", label: "Brand" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "https://github.com/Lantharos/Babblebird", label: "Source code" },
    { href: "mailto:hello@babblebird.dev", label: "hello@babblebird.dev" },
  ]
</script>

<footer class="page mt-14 pb-14">
  <div class="flex items-end gap-5 pr-6 sm:pr-10">
    <div class="h-px flex-1 bg-hairline"></div>
    <div class="flex items-end gap-2" aria-hidden="true">
      <span class="mb-7 rounded-[14px] rounded-br-[4px] bg-raised px-3 py-1.5 text-[14px] font-medium ring-1 ring-hairline" lang={goodbye.lang}>{goodbye.text}</span>
      <Bird class="h-9 w-[42px] -scale-x-100" />
    </div>
  </div>
  <div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-8 pt-10">
    <div>
      <a href="/" aria-label="Babblebird"><Wordmark class="text-[26px]" /></a>
      <p class="mt-2 text-[15px] text-ink-soft">Undoing Babel, one string at a time.</p>
    </div>
    <nav aria-label="Footer" class="flex max-w-xl flex-wrap gap-x-6 gap-y-2 text-[15px] text-ink-soft">
      {#each links as link}
        <a href={link.href} class="transition-colors hover:text-ink">{link.label}</a>
      {/each}
    </nav>
  </div>
  <p class="mt-8 text-[13px] text-ink-muted">Made by <a href="https://github.com/Lantharos" class="hover:text-ink">Lantharos</a>. Free for open source.</p>
</footer>
