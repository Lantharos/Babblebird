import { db, schema } from "../../db/core.ts"
import { handleCheckSuite, handlePullRequest } from "./delivery.ts"
import { handlePush } from "./push.ts"
import { addRepositories, removeInstallation, removeRepositories, updateRepository } from "./repositories.ts"

type Payload = Record<string, any>

async function saveInstallation(payload: Payload, suspended = false) {
  const { id, account } = payload.installation
  await db
    .insert(schema.installation)
    .values({ id, account: account.login, suspended })
    .onConflictDoUpdate({ target: schema.installation.id, set: { account: account.login, suspended } })
}

export async function handleEvent(event: string, payload: Payload) {
  const action = payload.action as string | undefined
  if (event === "installation") {
    if (action === "created") {
      await saveInstallation(payload)
      await addRepositories(payload.installation.id, payload.repositories ?? [])
    } else if (action === "deleted") await removeInstallation(payload.installation.id)
    else if (action === "suspend" || action === "unsuspend")
      await saveInstallation(payload, action === "suspend")
  } else if (event === "installation_repositories") {
    await saveInstallation(payload)
    await addRepositories(payload.installation.id, payload.repositories_added ?? [])
    await removeRepositories((payload.repositories_removed ?? []).map((repo: { id: number }) => repo.id))
  } else if (event === "push") await handlePush(payload as never)
  else if (event === "pull_request") await handlePullRequest(payload)
  else if (event === "check_suite") await handleCheckSuite(payload)
  else if (event === "repository") {
    if (action === "deleted") await removeRepositories([payload.repository.id])
    else await updateRepository(payload.repository)
  }
}
