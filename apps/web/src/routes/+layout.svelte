<script lang="ts">
  import "../styles/app.css"
  import type { Snippet } from "svelte"
  import { Session, setSession } from "#lib/api/session.svelte.ts"
  import Toasts from "#lib/ui/overlay/Toasts.svelte"

  let { children }: { children: Snippet } = $props()

  setSession(new Session())
</script>

{@render children()}
<Toasts />
