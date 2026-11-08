import { flag } from "@lantharos/pult"

export const deliveries = flag("deliveries", {
  label: "Deliveries",
  description:
    "Sends translations back to GitHub. Turn it off to hold every pull request and commit; what's waiting goes out once it's back on.",
  default: true,
  danger: "confirm",
})

export const newAccounts = flag("new-accounts", {
  label: "New accounts",
  description:
    "Lets people make a Babblebird account. Turn it off during a wave of spam sign-ups; everyone who has an account can still sign in.",
  default: true,
  danger: "confirm",
})
