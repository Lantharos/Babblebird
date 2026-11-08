import { waitUntil } from "cloudflare:workers"
import { GitHubError } from "../github/api.ts"
import { deliveries, newAccounts } from "./define/flags.ts"
import { backOffice } from "./pult.ts"

export interface Failure {
  kind: "sync" | "delivery"
  projectId: string
  problem: string
  error: unknown
}

const DETAIL_BUDGET = 4_000

function detailOf(error: unknown) {
  if (error instanceof GitHubError) return `${error.message}\n\n${error.body}`.slice(0, DETAIL_BUDGET)
  return String((error as Error).stack ?? error).slice(0, DETAIL_BUDGET)
}

export function reportFailure(failure: Failure) {
  const office = backOffice()
  if (!office) return
  waitUntil(
    import("./items.ts")
      .then(({ sendFailure }) => sendFailure(office.pult, { ...failure, detail: detailOf(failure.error) }))
      .catch((error) => console.error(error)),
  )
}

export async function deliveriesOn() {
  return (await backOffice()?.pult.flag(deliveries)) ?? true
}

export async function takingNewAccounts() {
  return (await backOffice()?.pult.flag(newAccounts)) ?? true
}
