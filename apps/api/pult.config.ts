import { defineConfig } from "@lantharos/pult"

export default defineConfig({
  project: "babblebird",
  include: ["src/inbox/define/**/*.ts"],
  delivery: { mode: "webhook", path: "/api/ops" },
  environments: ["dev", "prod"],
  sync: "prod",
})
