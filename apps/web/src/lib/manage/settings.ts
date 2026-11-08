import type { Delivery, Project, WhoTranslates } from "@babblebird/protocol"
import { api } from "#lib/api/client.ts"
import { projectPath } from "#lib/projects/project.svelte.ts"

export const deliveries: { value: Delivery; label: string; text: string }[] = [
  {
    value: "off",
    label: "Don’t send",
    text: "Babblebird reads the repository but never writes to it. Translations made here wait until sending is on.",
  },
  {
    value: "branch",
    label: "After the checks pass",
    text: "Small batches go to a babblebird/translations branch with a pull request that merges itself once the repository’s checks pass.",
  },
  {
    value: "direct",
    label: "Straight to the default branch",
    text: "Small batches are committed to the default branch. If it’s protected, they go through the translations branch instead.",
  },
]

export const access: { value: WhoTranslates; label: string; text: string }[] = [
  {
    value: "anyone",
    label: "Anyone signed in",
    text: "Everyone with an account can translate. Reviewers you add approve.",
  },
  {
    value: "members",
    label: "Only people you add",
    text: "Everyone else can still suggest translations for your translators to use.",
  },
]

export function saveSettings(
  project: Project,
  changes: Partial<Pick<Project, "delivery" | "whoTranslates">>,
) {
  return api.patch(`${projectPath(project.owner, project.name)}/settings`, changes)
}
