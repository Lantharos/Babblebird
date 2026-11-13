<script lang="ts">
  import "../styles/app.css"
  import { onMount, type Snippet } from "svelte"
  import { Session, setSession } from "#lib/api/session.svelte.ts"
  import Toasts from "#lib/ui/overlay/Toasts.svelte"

  let { children }: { children: Snippet } = $props()

  const session = setSession(new Session())
  onMount(() => void session.load())
</script>

{@render children()}
<Toasts />
