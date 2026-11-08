<script lang="ts">
  import Bird from "./Bird.svelte"

  let { class: className = "text-[22px]" }: { class?: string } = $props()
</script>

<span class="inline-flex font-semibold leading-none tracking-[-0.035em] whitespace-nowrap {className}" aria-label="Babblebird">
  <span aria-hidden="true">babbleb</span><span class="relative" aria-hidden="true">ı<Bird class="absolute -top-[0.08em] -left-[0.07em] h-[0.34em] w-[0.4em]" /></span><span aria-hidden="true">rd</span>
</span>
