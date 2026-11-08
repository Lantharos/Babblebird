<script lang="ts">
  import AreaIcon from "#lib/projects/AreaIcon.svelte"

  const areas = ["Desktop", "Seasons", "Focus", "Heft", "Playthings", "Settings"]
</script>

<figure class="m-0">
  <div class="grid w-fit grid-cols-3 gap-x-6 gap-y-5" aria-hidden="true">
    {#each areas as area, index}
      <div class="tile flex flex-col items-center gap-2" style:--order={index}>
        <AreaIcon name={area} icon={null} class="size-16" />
        <span class="text-[14px] text-ink-soft">{area}</span>
      </div>
    {/each}
  </div>
  <figcaption class="mt-5 max-w-64 text-[17px] leading-snug text-ink-soft">Apps and extensions become areas, named after your code.</figcaption>
</figure>

<style>
  @media (prefers-reduced-motion: no-preference) {
    .tile {
      animation: drop var(--spring-thrown-duration) var(--spring-thrown) both;
      animation-delay: calc(400ms + var(--order) * 70ms);
    }
  }

  @keyframes drop {
    from {
      opacity: 0;
      translate: 0 -14px;
      scale: 0.9;
    }
  }
</style>
