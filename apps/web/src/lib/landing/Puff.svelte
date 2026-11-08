<script lang="ts">
  import { onMount } from "svelte"
  import { type Greeting, greetings } from "./greetings.ts"
  import { Speaker } from "./speaker.ts"

  let { class: className = "" }: { class?: string } = $props()

  let root = $state<HTMLDivElement>()
  let word = $state<Greeting>(greetings[0]!)

  onMount(() => {
    const speaker = new Speaker(root!, (next) => (word = next))
    return () => speaker.stop()
  })
</script>

<div bind:this={root} class="puff relative h-[23rem] w-[38rem] select-none {className}" aria-hidden="true">
  <svg viewBox="0 0 200 200" class="absolute bottom-0 left-0 size-80 overflow-visible">
    <g class="idle">
      <g data-part="body">
        <path d="M58 150c-12 10-26 14-34 12 8-6 13-14 15-22" fill="var(--puff)" />
        <path d="M98 47c-2-10 3-17 11-19-1 6 0 11 4 15" fill="var(--puff)" />
        <ellipse cx="100" cy="104" rx="62" ry="58" fill="var(--puff)" />
        <ellipse cx="96" cy="122" rx="40" ry="32" fill="var(--puff-belly)" />
        <ellipse cx="70" cy="114" rx="13" ry="21" transform="rotate(24 70 114)" fill="var(--puff-wing)" />
        <path data-part="jaw" d="M151 102h17l-17 9z" fill="var(--puff-jaw)" />
        <path data-part="beak" d="M150 92l22 9.5h-21c-2-3.5-2.5-6-1-9.5z" fill="var(--beak)" />
        <g data-part="eye">
          <ellipse cx="128" cy="86" rx="9.5" ry="11.5" fill="#1b1612" />
          <circle cx="124.5" cy="81.5" r="4" fill="#fff" />
          <circle cx="131" cy="91" r="1.8" fill="#fff" opacity="0.8" />
        </g>
        <ellipse cx="137" cy="108" rx="9" ry="6" fill="var(--puff-cheek)" opacity="0.7" />
      </g>
      <path d="M88 160v12m-5 0h10M108 160v12m-5 0h10" stroke="var(--beak)" stroke-width="4" stroke-linecap="round" />
    </g>
  </svg>

  <div class="absolute top-[12.4rem] left-[17.6rem] size-0">
    <div data-part="bubble" class="absolute bottom-0 left-0 origin-bottom-left">
      <span class="tail absolute -bottom-px -left-[10px] block size-6 bg-ink"></span>
      <span class="relative block rounded-[30px] rounded-bl-[8px] bg-ink px-8 py-5 text-[56px] leading-none font-semibold tracking-[-0.035em] whitespace-nowrap text-canvas" lang={word.lang}>
        {word.text}
      </span>
    </div>
  </div>
</div>

<style>
  .puff {
    --puff: #ff5f45;
    --puff-belly: light-dark(#ffe6da, #ffdccc);
    --puff-wing: light-dark(#e8432b, #f04f36);
    --puff-jaw: light-dark(#962b17, #f29b7a);
    --puff-cheek: light-dark(#ff9a8a, #ffa494);
  }

  .tail {
    clip-path: polygon(0 100%, 100% 25%, 100% 100%);
  }

  [data-part="body"],
  [data-part="beak"],
  [data-part="jaw"],
  [data-part="eye"],
  .idle {
    transform-box: fill-box;
  }

  [data-part="body"],
  .idle {
    transform-origin: 50% 100%;
  }

  [data-part="beak"] {
    transform-origin: 0% 100%;
  }

  [data-part="jaw"] {
    transform-origin: 0% 0%;
  }

  [data-part="eye"] {
    transform-origin: center;
  }

  @media (prefers-reduced-motion: no-preference) {
    .idle {
      animation: breathe 3.6s ease-in-out infinite;
    }

    :global(.puff.paused) .idle {
      animation-play-state: paused;
    }
  }

  @keyframes breathe {
    50% {
      scale: 1.015 0.985;
    }
  }
</style>
