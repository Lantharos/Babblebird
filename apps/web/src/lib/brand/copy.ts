import { toasts } from "#lib/ui/overlay/toasts.svelte.ts"

export async function copy(text: string, message = "Copied") {
  await navigator.clipboard.writeText(text)
  toasts.show(message)
}
