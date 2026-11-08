<script lang="ts">
  import { onMount } from "svelte"
  import { greetings } from "./greetings.ts"
  import { Speaker } from "./speaker.ts"

  let { class: className = "" }: { class?: string } = $props()

  let root = $state<HTMLDivElement>()
  let word = $state(greetings[0]!)
  let look = $state({ x: 0, y: 0 })
  const LOOK = 1.4

  onMount(() => {
    const speaker = new Speaker(root!, (next) => (word = next))
    const follow = (event: PointerEvent) => {
      const box = root!.getBoundingClientRect()
      const dx = event.clientX - (box.left + box.width * 0.4)
      const dy = event.clientY - (box.top + box.height * 0.45)
      const distance = Math.hypot(dx, dy) || 1
      look = { x: (dx / distance) * LOOK, y: (dy / distance) * LOOK }
    }
    if (!speaker.still) addEventListener("pointermove", follow, { passive: true })
    return () => {
      speaker.stop()
      removeEventListener("pointermove", follow)
    }
  })
</script>

<div bind:this={root} class="mascot relative h-64 w-[25rem] select-none {className}" aria-hidden="true">
  <svg viewBox="0 0 128 128" class="absolute bottom-0 left-0 size-56 overflow-visible">
    <g class="idle">
      <g data-part="body">
        <g transform="scale(2)">
          <path d="M27 16.6c-1.2-2.9-.3-5.6 2.2-6.9M31.2 16c-.2-2.6 1.2-4.6 3.6-5.2" fill="none" stroke="var(--ink)" stroke-width="1.7" stroke-linecap="round" />
          <path d="M30 16a16 16 0 1 1-9.4 28.94L13 49l2.9-8.6A16 16 0 0 1 30 16Z" fill="var(--ink)" />
          <path data-part="jaw" d="M45.5 31.6H53.4l-8 3.1a16 16 0 0 0 .1-3.1Z" fill="color-mix(in oklab, var(--beak) 78%, var(--ink))" />
          <path data-part="beak" d="M45.6 28.2 54 31.6H45.5Z" fill="var(--beak)" />
          <g class="look" style:translate="{look.x}px {look.y}px">
            <g data-part="eye">
              <circle cx="37.5" cy="27" r="2.9" fill="var(--canvas)" />
              <circle cx="38.3" cy="27.4" r="1.5" fill="var(--ink)" />
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>

  <div class="absolute top-[8.6rem] left-[12.4rem] size-0">
    <div data-part="bubble" class="bubble absolute bottom-0 left-0 origin-bottom-left">
      <span class="tail absolute -bottom-px -left-[7px] block size-4 bg-raised"></span>
      <span class="relative block rounded-[20px] rounded-bl-[5px] bg-raised px-5 py-3 text-[24px] leading-none font-semibold whitespace-nowrap" lang={word.lang}>
        {word.text}
      </span>
    </div>
  </div>
</div>

<style>
  .bubble {
    filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.06)) drop-shadow(0 6px 14px rgb(0 0 0 / 0.06));
  }

  .tail {
    clip-path: polygon(0 100%, 100% 20%, 100% 100%);
  }

  [data-part="body"],
  [data-part="beak"],
  [data-part="jaw"],
  [data-part="eye"],
  .idle {
    transform-box: fill-box;
  }

  [data-part="body"] {
    transform-origin: 45% 100%;
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

  .idle {
    transform-origin: 45% 100%;
  }

  .look {
    transition: translate 260ms var(--ease-decelerate);
  }

  @media (prefers-reduced-motion: no-preference) {
    .idle {
      animation: breathe 3.6s ease-in-out infinite;
    }

    :global(.mascot.paused) .idle {
      animation-play-state: paused;
    }
  }

  @keyframes breathe {
    50% {
      scale: 1.012 0.988;
    }
  }
</style>
