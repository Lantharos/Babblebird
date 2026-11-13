<script lang="ts">
  import AreaIcon from "#lib/projects/AreaIcon.svelte"

  const steps = [
    {
      name: "Your repository",
      text: "A push changes the English. Only the files that changed are read again.",
    },
    { name: "Translate", text: "Translators see it in their language, with what changed marked for review." },
    { name: "Back in main", text: "Their work goes back as one small commit, merged once your checks pass." },
  ]
</script>

<ol class="relative grid gap-12 md:grid-cols-3 md:gap-10">
  <span class="absolute top-12 right-[16%] left-[16%] hidden border-t-2 border-dashed border-hairline md:block" aria-hidden="true"></span>
  {#each steps as step}
    <li class="relative flex flex-col items-center text-center">
      <AreaIcon name={step.name} icon={null} class="size-24" />
      <p class="mt-6 max-w-72 text-[18px] leading-relaxed text-ink-soft">{step.text}</p>
    </li>
  {/each}
</ol>
