import { onMount } from "svelte"

export function poll(run: () => Promise<unknown>, every: number, active: () => boolean) {
  onMount(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      if (!document.hidden && active()) await run().catch(() => {})
      timer = setTimeout(tick, every)
    }
    timer = setTimeout(tick, every)
    return () => clearTimeout(timer)
  })
}
