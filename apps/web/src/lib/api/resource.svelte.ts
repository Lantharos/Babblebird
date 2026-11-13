import { api } from "./client.ts"

export class Resource<T> {
  data = $state<T>()
  error = $state<Error>()
  #request: Promise<void> | null = null

  constructor(readonly path: string) {}

  refresh() {
    this.#request ??= api
      .get<T>(this.path)
      .then((data) => {
        this.data = data
        this.error = undefined
      })
      .catch((error: Error) => {
        this.error = error
      })
      .finally(() => {
        this.#request = null
      })
    return this.#request
  }
}

const cache = new Map<string, Resource<unknown>>()

function entryFor<T>(path: string): Resource<T> {
  let entry = cache.get(path) as Resource<T> | undefined
  if (!entry) {
    entry = new Resource<T>(path)
    cache.set(path, entry as Resource<unknown>)
  }
  return entry
}

export function resource<T>(path: string): Resource<T> {
  const entry = entryFor<T>(path)
  void entry.refresh()
  return entry
}

export function seed<T>(path: string, data: T) {
  entryFor<T>(path).data = data
}
