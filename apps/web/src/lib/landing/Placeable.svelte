<script lang="ts">
  let { text }: { text: string } = $props()
</script>

<span class="mono-placeable px-1 py-px">{"{ "}{text}{" }"}</span>
