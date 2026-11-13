import type { Filter, FoundString, Progress, StringDetail, StringPage, StringRow } from "@babblebird/protocol"
import { ApiError, api } from "#lib/api/client.ts"
import { projectPath } from "#lib/projects/project.svelte.ts"
import { LiveChannel } from "./live.svelte.ts"

export type Detail = StringDetail & { row: StringRow }

export class Editor {
  rows = $state<(StringRow | FoundString)[]>([])
  next = $state<string | null>(null)
  loading = $state(false)
  selected = $state<number | null>(null)
  detail = $state<Detail | null>(null)
  filter = $state<Filter>("untranslated")
  search = $state("")
  incoming = $state<StringRow | null>(null)
  readonly live: LiveChannel
  #generation = 0
  #opening: number | null

  constructor(
    readonly owner: string,
    readonly name: string,
    readonly area: string,
    readonly lang: string,
    private readonly self: () => string | null,
    private readonly onprogress: (area: string, progress: Progress) => void,
    opening: number | null,
  ) {
    this.#opening = opening
    this.live = new LiveChannel(`${projectPath(owner, name)}/live?lang=${lang}`, (event) => {
      if (event.type === "discussion") {
        if (this.detail?.row.id === event.id) void this.refreshDiscussion(event.id)
        return
      }
      if (event.type === "synced") {
        if (event.area === this.area && !this.search.trim()) void this.reload()
        return
      }
      this.onprogress(event.area, event.progress)
      this.rows = this.rows.map((row) => (row.id === event.row.id ? { ...row, ...event.row } : row))
      if (this.detail?.row.id === event.row.id && event.row.translation?.by?.id !== this.self())
        this.incoming = event.row
    })
  }

  others(string: number) {
    return this.live.viewers.filter((viewer) => viewer.string === string && viewer.id !== this.self())
  }

  takeIncoming() {
    if (this.incoming) this.replace(this.incoming)
    this.incoming = null
  }

  get base() {
    return projectPath(this.owner, this.name)
  }

  async reload() {
    const generation = ++this.#generation
    this.rows = []
    this.next = null
    await this.more(generation)
    if (generation !== this.#generation) return
    const opening = this.#opening
    this.#opening = null
    if (opening !== null) await this.select(opening)
    else if (!this.rows.some((row) => row.id === this.selected)) await this.select(this.rows[0]?.id ?? null)
  }

  async more(generation = this.#generation) {
    if (this.loading && generation === this.#generation && this.rows.length) return
    this.loading = true
    const search = this.search.trim()
    const page = search
      ? {
          rows: await api.get<FoundString[]>(
            `${this.base}/search?${new URLSearchParams({ lang: this.lang, q: search })}`,
          ),
          next: null,
        }
      : await api.get<StringPage>(
          `${this.base}/areas/${this.area}/strings?${new URLSearchParams({
            lang: this.lang,
            filter: this.filter,
            ...(this.next && { after: this.next }),
          })}`,
        )
    if (generation !== this.#generation) return
    this.rows = [...this.rows, ...page.rows]
    this.next = page.next
    this.loading = false
  }

  async select(id: number | null) {
    this.selected = id
    this.detail = null
    this.incoming = null
    this.live.focus(id)
    if (id === null) return
    const detail = await api.get<Detail>(`${this.base}/strings/${id}?lang=${this.lang}`)
    if (this.selected === id) this.detail = detail
  }

  async step(direction: 1 | -1) {
    const index = this.rows.findIndex((row) => row.id === this.selected)
    const target = index + direction
    if (target >= this.rows.length && this.next) await this.more()
    const row = this.rows[target]
    if (row) await this.select(row.id)
  }

  replace(row: StringRow) {
    this.rows = this.rows.map((other) => (other.id === row.id ? { ...other, ...row } : other))
    if (this.detail?.row.id === row.id) this.detail.row = row
  }

  async save(body: string, approve: boolean) {
    const id = this.selected!
    try {
      const saved = await api.put<{ row: StringRow }>(`${this.base}/strings/${id}/${this.lang}`, {
        body,
        approve,
      })
      this.replace(saved.row)
      return null
    } catch (error) {
      if (error instanceof ApiError) return error.message
      throw error
    }
  }

  async suggest(body: string) {
    await api.post(`${this.base}/strings/${this.selected}/${this.lang}/suggestions`, { body })
    await this.select(this.selected)
  }

  async accept(suggestion: number) {
    await api.post(`${this.base}/strings/${this.selected}/${this.lang}/suggestions/${suggestion}/accept`)
    await this.select(this.selected)
    if (this.detail) this.replace(this.detail.row)
  }

  async refreshDiscussion(id: number) {
    const fresh = await api.get<Detail>(`${this.base}/strings/${id}?lang=${this.lang}`)
    if (this.detail?.row.id !== id) return
    this.detail.discussion = fresh.discussion
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, threads: fresh.row.threads } : row))
  }

  async comment(body: string, english: boolean) {
    const id = this.selected!
    await api.post(`${this.base}/strings/${id}/${this.lang}/comments`, { body, english })
    await this.refreshDiscussion(id)
  }

  async resolve(english: boolean, resolved: boolean) {
    const id = this.selected!
    await api.put(`${this.base}/strings/${id}/${this.lang}/comments/resolved`, { english, resolved })
    await this.refreshDiscussion(id)
  }

  async dismiss(suggestion: number) {
    await api.delete(`${this.base}/strings/${this.selected}/${this.lang}/suggestions/${suggestion}`)
    await this.select(this.selected)
  }
}
