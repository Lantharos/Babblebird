import type { Filter, StringDetail, StringPage, StringRow } from "@babblebird/protocol"
import { ApiError, api } from "#lib/api/client.ts"
import { projectPath } from "#lib/projects/project.svelte.ts"

export type Detail = StringDetail & { row: StringRow }

export class Editor {
  rows = $state<StringRow[]>([])
  next = $state<string | null>(null)
  loading = $state(false)
  selected = $state<number | null>(null)
  detail = $state<Detail | null>(null)
  filter = $state<Filter>("untranslated")
  search = $state("")
  #generation = 0

  constructor(
    readonly owner: string,
    readonly name: string,
    readonly area: string,
    readonly lang: string,
  ) {}

  get base() {
    return projectPath(this.owner, this.name)
  }

  async reload() {
    const generation = ++this.#generation
    this.rows = []
    this.next = null
    await this.more(generation)
    if (generation !== this.#generation) return
    if (!this.rows.some((row) => row.id === this.selected)) await this.select(this.rows[0]?.id ?? null)
  }

  async more(generation = this.#generation) {
    if (this.loading && generation === this.#generation && this.rows.length) return
    this.loading = true
    const query = new URLSearchParams({ lang: this.lang, filter: this.filter })
    if (this.next) query.set("after", this.next)
    if (this.search.trim()) query.set("q", this.search.trim())
    const page = await api.get<StringPage>(`${this.base}/areas/${this.area}/strings?${query}`)
    if (generation !== this.#generation) return
    this.rows = [...this.rows, ...page.rows]
    this.next = page.next
    this.loading = false
  }

  async select(id: number | null) {
    this.selected = id
    this.detail = null
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
    this.rows = this.rows.map((other) => (other.id === row.id ? row : other))
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

  async dismiss(suggestion: number) {
    await api.delete(`${this.base}/strings/${this.selected}/${this.lang}/suggestions/${suggestion}`)
    await this.select(this.selected)
  }
}
