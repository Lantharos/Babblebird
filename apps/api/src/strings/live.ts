import type { LiveEvent, LiveFocus, Presence } from "@babblebird/protocol"

export const VIEWER_HEADER = "x-babblebird-viewer"

interface Attachment {
  lang: string
  viewer: Omit<Presence, "string"> | null
  string: number | null
}

export class Live {
  constructor(private readonly ctx: DurableObjectState) {}

  accept(request: Request) {
    const lang = new URL(request.url).searchParams.get("lang")!
    const viewer = request.headers.get(VIEWER_HEADER)
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server, [lang])
    server.serializeAttachment({
      lang,
      viewer: viewer ? JSON.parse(viewer) : null,
      string: null,
    } satisfies Attachment)
    this.presence(lang)
    return new Response(null, { status: 101, webSocket: client })
  }

  receive(socket: WebSocket, message: string | ArrayBuffer) {
    const focus = JSON.parse(String(message)) as LiveFocus
    const attachment = socket.deserializeAttachment() as Attachment
    socket.serializeAttachment({ ...attachment, string: focus.string } satisfies Attachment)
    this.presence(attachment.lang)
  }

  leave(socket: WebSocket) {
    const { lang } = socket.deserializeAttachment() as Attachment
    socket.close()
    this.presence(lang, socket)
  }

  watching(lang: string) {
    return this.ctx.getWebSockets(lang).length > 0
  }

  broadcast(lang: string, event: LiveEvent, sockets = this.ctx.getWebSockets(lang)) {
    const message = JSON.stringify(event)
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.send(message)
  }

  broadcastAll(event: LiveEvent) {
    this.broadcast("", event, this.ctx.getWebSockets())
  }

  private presence(lang: string, leaving?: WebSocket) {
    const sockets = this.ctx.getWebSockets(lang).filter((socket) => socket !== leaving)
    const viewers = new Map<string, Presence>()
    for (const socket of sockets) {
      const { viewer, string } = socket.deserializeAttachment() as Attachment
      if (viewer) viewers.set(viewer.id, { ...viewer, string })
    }
    this.broadcast(lang, { type: "presence", viewers: [...viewers.values()] }, sockets)
  }
}
