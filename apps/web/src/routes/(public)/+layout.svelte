<script lang="ts">
  import { getSession } from "#lib/api/session.svelte.ts"

  let { data, children } = $props()

  const session = getSession()
  const seed = () => session.seed(data.me, data.language)
  seed()
  $effect.pre(seed)
</script>

{@render children()}
