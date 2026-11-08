<script lang="ts">
  import LegalPage from "#lib/layout/LegalPage.svelte"

  let { data } = $props()
</script>

<LegalPage page={data.page} />
