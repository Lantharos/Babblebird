import {
  type Expression,
  type Message,
  type Pattern,
  Placeable,
  SelectExpression,
  type Term,
  TermReference,
  TextElement,
  VariableReference,
} from "@fluent/syntax"

function expressionText(expression: Expression): string {
  if (expression instanceof SelectExpression) {
    const chosen = expression.variants.find((variant) => variant.default) ?? expression.variants[0]
    return chosen ? patternText(chosen.value) : ""
  }
  if (expression instanceof VariableReference) return `{$${expression.id.name}}`
  if (expression instanceof TermReference) return `{-${expression.id.name}}`
  if (expression instanceof Placeable) return expressionText(expression.expression)
  return "{}"
}

export function patternText(pattern: Pattern): string {
  let text = ""
  for (const element of pattern.elements) {
    if (element instanceof TextElement) text += element.value
    else text += expressionText(element.expression)
  }
  return text
}

export function plainOf(entry: Message | Term) {
  const pattern = entry.value ?? entry.attributes[0]?.value
  return pattern ? patternText(pattern).replace(/\s+/g, " ").trim() : ""
}

export function wordCount(plain: string) {
  return plain
    .replace(/\{[^}]*\}/g, " ")
    .split(/\s+/)
    .filter(Boolean).length
}
