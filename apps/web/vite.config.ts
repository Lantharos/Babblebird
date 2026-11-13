import adapter from "@sveltejs/adapter-cloudflare"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [tailwindcss(), sveltekit({ adapter: adapter(), version: { pollInterval: 60_000 } })],
  server: {
    port: 5180,
    strictPort: true,
    proxy: { "/api": { target: "http://localhost:8787", ws: true } },
  },
})
