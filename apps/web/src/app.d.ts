declare global {
  namespace App {}

  namespace Cloudflare {
    interface Env {
      API: { fetch: typeof fetch }
    }
  }
}

export {}
