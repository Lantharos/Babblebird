<script lang="ts">
  import Header from "#lib/layout/Header.svelte"
  import { page } from "$app/state"

  const KINDS: Record<string, string> = {
    reply: "replies to your comments",
    strings: "emails about new strings",
    announcement: "messages from maintainers",
  }
  const kind = $derived(KINDS[page.url.searchParams.get("kind") ?? ""] ?? "these emails")
</script>

<svelte:head><title>Unsubscribed · Babblebird</title></svelte:head>

<Header />

<main id="main" class="page max-w-xl pt-16 pb-24">
  <h1 class="title">You're unsubscribed</h1>
  <p class="mt-3 text-body text-ink-soft">You won't get {kind} anymore. You can turn them back on in <a href="/settings" class="link">settings</a>.</p>
</main>
