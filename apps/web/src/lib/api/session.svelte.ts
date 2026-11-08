import { api } from "./client.ts"

export interface Me {
  id: string
  name: string
  email: string
  image: string | null
  githubLogin: string | null
  languages: string[]
}

const LANGUAGE = "babblebird:language"

function remembered() {
  try {
    return localStorage.getItem(LANGUAGE)
  } catch {
    return null
  }
}

class Session {
  loaded = $state(false)
  me = $state<Me | null>(null)
  #language = $state<string | null>(null)

  language = $derived(this.#language ?? this.me?.languages[0] ?? null)

  async load() {
    if (this.loaded) return
    this.#language = remembered()
    this.me = await api.get<Me | null>("/me")
    this.loaded = true
  }

  browseIn(lang: string) {
    this.#language = lang
    try {
      localStorage.setItem(LANGUAGE, lang)
    } catch {}
  }

  async setLanguages(languages: string[]) {
    await api.put("/me/languages", { languages })
    if (this.me) this.me.languages = languages
  }

  async reload() {
    this.me = await api.get<Me | null>("/me")
  }
}

export const session = new Session()
