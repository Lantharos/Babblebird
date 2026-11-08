import { type BaseNode, Visitor } from "@fluent/syntax"

export interface References {
  variables: Set<string>
  terms: Set<string>
  messages: Set<string>
}

class Collector extends Visitor {
  found: References = { variables: new Set(), terms: new Set(), messages: new Set() }

  visitVariableReference(node: { id: { name: string } }) {
    this.found.variables.add(node.id.name)
  }

  visitTermReference(node: BaseNode & { id: { name: string } }) {
    this.found.terms.add(node.id.name)
    this.genericVisit(node)
  }

  visitMessageReference(node: { id: { name: string } }) {
    this.found.messages.add(node.id.name)
  }
}

export function referencesOf(node: BaseNode) {
  const collector = new Collector()
  collector.visit(node)
  return collector.found
}
