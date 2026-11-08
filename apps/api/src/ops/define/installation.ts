import { resource } from "@lantharos/pult"
import { z } from "zod"
import { missingRepositories } from "../../github/events/repositories.ts"
import { type InstallationView, installations } from "../data/installations.ts"
import { counted } from "../data/labels.ts"
import { projects } from "../data/projects.ts"

const accountPage = (installation: InstallationView) => `https://github.com/${installation.account}`

export const installation = resource("installation", {
  icon: "building",
  get: (id) => installations.byId(id),
  find: (query, limit) => installations.search(query, limit),
  list: {
    filters: z.object({ suspended: z.boolean().optional() }),
    run: ({ query, filters, cursor, limit }) => installations.browse(query, filters.suspended, cursor, limit),
  },
  id: (installation) => String(installation.id),
  title: (installation) => installation.account,
  subtitle: (installation) =>
    [counted(installation.projects, "project"), installation.suspended && "Suspended on GitHub"]
      .filter(Boolean)
      .join(" · "),
  fields: (installation) => ({
    projects: installation.projects,
    suspended: installation.suspended,
    added: installation.createdAt,
  }),
  url: accountPage,
  related: {
    projects: { resource: "project", list: (installation) => projects.ofInstallation(installation.id) },
  },
  actions: (action) => ({
    addMissing: action({
      label: "Add missing repositories",
      description:
        "Asks GitHub which repositories this installation covers and adds the ones Babblebird doesn't know yet, for when GitHub's notice never arrived.",
      automatable: true,
      when: (installation) => !installation.suspended,
      run: async ({ record }) => {
        const added = await missingRepositories(record.id)
        return added.length ? `Added ${added.join(", ")}` : "Babblebird already has every repository"
      },
    }),
  }),
})
