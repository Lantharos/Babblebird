import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { mergeMessage, messagesOf, patchMessages, readFile } from "../src/index.ts"

const german = readFileSync(join(import.meta.dir, "fixtures/desktop.de.ftl"), "utf8")
const keys = readFile(german).units.map((unit) => unit.key)

test("a message changed on one side takes that side, and on both sides is a conflict", () => {
  expect(mergeMessage("= A", "= A", "= B")).toEqual({ kind: "theirs" })
  expect(mergeMessage("= A", "= B", "= A")).toEqual({ kind: "ours" })
  expect(mergeMessage("= A", "= B", "= B")).toEqual({ kind: "same" })
  expect(mergeMessage("= A", "= B", "= C")).toEqual({ kind: "conflict" })
  expect(mergeMessage(null, "= B", null)).toEqual({ kind: "ours" })
  expect(mergeMessage("= A", "= A", null)).toEqual({ kind: "theirs" })
})

test("patching a real file touches only the messages that changed", () => {
  const [first, second] = keys
  const added = "taskbar-made-up = Erfunden"
  const patched = patchMessages(
    german,
    [first!, "taskbar-made-up", ...keys.slice(1)],
    new Map([
      [second!, "= Geändert"],
      ["taskbar-made-up", "= Erfunden"],
    ]),
  )
  const before = messagesOf(german)
  const after = messagesOf(patched)
  expect(after.get(second!)).toBe("= Geändert")
  expect(patched).toContain(added)
  for (const key of keys.slice(2)) expect(after.get(key)).toBe(before.get(key)!)
  expect(patched.split("\n").filter((line) => !german.split("\n").includes(line))).toEqual([
    added,
    `${second} = Geändert`,
  ])
})
