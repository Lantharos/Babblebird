import { type Greeting, greetings } from "./greetings.ts"

const SPRING = "linear(0, 0.18 4%, 0.6 12%, 0.94 20%, 1.08 27%, 1.1 31%, 1.06 38%, 1 46%, 0.98 55%, 1 70%, 1)"
const SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)"
const LIFT = "cubic-bezier(0.55, 0, 0.75, 0)"
const HOLD_MS = 1500
const BETWEEN_MS = 260

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class Speaker {
  readonly still = matchMedia("(prefers-reduced-motion: reduce)").matches
  #visible = true
  #shown = !document.hidden
  #wake: (() => void) | null = null
  #stopped = false
  #observer: IntersectionObserver
  #part: (name: string) => Element

  constructor(
    readonly root: HTMLElement,
    readonly say: (greeting: Greeting) => void,
  ) {
    this.#part = (name) => root.querySelector(`[data-part="${name}"]`)!
    this.#observer = new IntersectionObserver(([entry]) => {
      this.#visible = !!entry?.isIntersecting
      this.#update()
    })
    this.#observer.observe(root)
    document.addEventListener("visibilitychange", this.#onVisibility)
    if (!this.still) {
      this.#part("bubble").animate([{ opacity: 0 }], { duration: 0, fill: "forwards" })
      void this.#talk()
      void this.#blink()
    }
  }

  #onVisibility = () => {
    this.#shown = !document.hidden
    this.#update()
  }

  #update() {
    const running = this.#visible && this.#shown
    this.root.classList.toggle("paused", !running)
    for (const animation of this.root.getAnimations({ subtree: true })) {
      if (running && animation.playState === "paused") animation.play()
      else if (!running && animation.playState === "running") animation.pause()
    }
    if (running) {
      this.#wake?.()
      this.#wake = null
    }
  }

  async #ready() {
    while (!this.#stopped && !(this.#visible && this.#shown))
      await new Promise<void>((resolve) => (this.#wake = resolve))
  }

  #animate(name: string, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    return this.#part(name).animate(keyframes, { fill: "forwards", ...options }).finished
  }

  async #speak() {
    const bubble = this.#part("bubble")
    await Promise.all([
      this.#animate("body", [{ scale: "1 1" }, { scale: "1.05 0.93", rotate: "3deg" }], {
        duration: 140,
        easing: "ease-out",
      }),
      this.#animate("beak", [{ rotate: "0deg" }, { rotate: "-32deg" }], {
        duration: 140,
        easing: "ease-out",
      }),
      this.#animate("jaw", [{ rotate: "0deg" }, { rotate: "16deg" }], { duration: 140, easing: "ease-out" }),
    ])
    void this.#animate(
      "body",
      [
        { scale: "1.05 0.93", rotate: "3deg" },
        { scale: "0.97 1.05", rotate: "-5deg", offset: 0.35 },
        { scale: "1 1", rotate: "0deg" },
      ],
      {
        duration: 620,
        easing: SETTLE,
      },
    )
    void this.#animate(
      "beak",
      [{ rotate: "-32deg" }, { rotate: "-32deg", offset: 0.5 }, { rotate: "0deg" }],
      { duration: 420, easing: SETTLE },
    )
    void this.#animate("jaw", [{ rotate: "16deg" }, { rotate: "16deg", offset: 0.5 }, { rotate: "0deg" }], {
      duration: 420,
      easing: SETTLE,
    })
    await bubble.animate(
      [
        { opacity: 0, transform: "translate(-6px, 4px) scale(0.15, 0.1)" },
        { opacity: 1, transform: "translate(0, 0) scale(1, 1)" },
      ],
      { duration: 560, easing: SPRING, fill: "forwards" },
    ).finished
  }

  async #leave() {
    const bubble = this.#part("bubble")
    await bubble.animate(
      [
        { opacity: 1, transform: "translate(0, 0) scale(1) rotate(0deg)" },
        { opacity: 1, transform: "translate(4px, -10px) scale(1.02, 0.98) rotate(-2deg)", offset: 0.25 },
        { opacity: 0, transform: "translate(46px, -86px) scale(0.86) rotate(7deg)" },
      ],
      { duration: 760, easing: LIFT, fill: "forwards" },
    ).finished
  }

  async #talk() {
    for (let index = 0; !this.#stopped; index = (index + 1) % greetings.length) {
      await this.#ready()
      this.say(greetings[index]!)
      await this.#speak()
      await sleep(HOLD_MS)
      await this.#ready()
      await this.#leave()
      await sleep(BETWEEN_MS)
    }
  }

  async #blink() {
    while (!this.#stopped) {
      await sleep(1800 + Math.random() * 3600)
      await this.#ready()
      await this.#animate("eye", [{ scale: "1 1" }, { scale: "1 0.08" }, { scale: "1 1" }], {
        duration: 160,
        easing: "ease-in-out",
        fill: "none",
      })
    }
  }

  stop() {
    this.#stopped = true
    this.#wake?.()
    this.#observer.disconnect()
    document.removeEventListener("visibilitychange", this.#onVisibility)
  }
}
