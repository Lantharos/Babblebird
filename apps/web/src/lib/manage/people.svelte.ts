import type { Member, Role } from "@babblebird/protocol"

export interface Invitation {
  who: string
  role: Role
  languages: string[] | null
  areas: string[] | null
}

export interface People {
  members: Member[]
  invitations: Invitation[]
}

export const roles: { value: Role; label: string }[] = [
  { value: "translator", label: "Translator" },
  { value: "reviewer", label: "Reviewer" },
  { value: "admin", label: "Maintainer" },
]

export const roleName = (role: Role) => roles.find((entry) => entry.value === role)!.label
