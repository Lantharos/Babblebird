import { API_BASE, type LiveEvent, type LiveFocus, type Presence } from "@babblebird/protocol"

const RETRY_MS = [1_000, 2_000, 5_000, 15_000]

export class LiveChannel {
  viewers = $state<Presence[]>([])
  #socket: WebSocket | null = null
  #closed = false
  #attempt = 0
  #focus: number | null = null

  constructor(
    private readonly path: string,
    private readonly onevent: (event: Exclude<LiveEvent, { type: "presence" }>) => void,
  ) {}

  open() {
    const url = new URL(`${API_BASE}${this.path}`, location.href)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    const socket = new WebSocket(url)
    socket.onopen = () => {
      this.#attempt = 0
      this.send()
    }
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as LiveEvent
      if (event.type === "presence") this.viewers = event.viewers
      else this.onevent(event)
    }
    socket.onclose = () => {
      this.viewers = []
      if (!this.#closed)
        setTimeout(() => this.open(), RETRY_MS[Math.min(this.#attempt++, RETRY_MS.length - 1)])
    }
    this.#socket = socket
  }

  focus(string: number | null) {
    this.#focus = string
    this.send()
  }

  close() {
    this.#closed = true
    this.#socket?.close()
  }

  private send() {
    if (this.#socket?.readyState === WebSocket.OPEN)
      this.#socket.send(JSON.stringify({ type: "focus", string: this.#focus } satisfies LiveFocus))
  }
}
