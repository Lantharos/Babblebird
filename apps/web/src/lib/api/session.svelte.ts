import { createContext } from "svelte"
import { api } from "./client.ts"

export interface Me {
  id: string
  name: string
  email: string
  image: string | null
  githubLogin: string | null
  languages: string[]
}

export const LANGUAGE_COOKIE = "babblebird-language"
const YEAR = 365 * 24 * 60 * 60 * 1000

export const browsedLanguages = (me: Me | null, language: string | null) =>
  me?.languages.length ? me.languages : language ? [language] : []

export class Session {
  loaded = $state(false)
  me = $state<Me | null>(null)
  #language = $state<string | null>(null)

  language = $derived(this.#language ?? this.me?.languages[0] ?? null)
  browsing = $derived(browsedLanguages(this.me, this.#language))

  seed(me: Me | null, language: string | null) {
    this.me = me
    this.#language = language
    this.loaded = true
  }

  async load() {
    if (this.loaded) return
    this.me = await api.get<Me | null>("/me")
    this.loaded = true
  }

  browseIn(lang: string) {
    this.#language = lang
    void cookieStore.set({
      name: LANGUAGE_COOKIE,
      value: lang,
      path: "/",
      expires: Date.now() + YEAR,
      sameSite: "lax",
    })
  }

  async setLanguages(languages: string[]) {
    await api.put("/me/languages", { languages })
    if (this.me) this.me.languages = languages
  }

  async reload() {
    this.me = await api.get<Me | null>("/me")
  }
}

export const [getSession, setSession] = createContext<Session>()
