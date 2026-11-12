export { termsIn } from "./checks/glossary.ts"
export {
  type GlossaryTerm,
  glossaryHints,
  PROBLEM_BITS,
  type Problem,
  type ProblemCode,
  problemFlags,
  runChecks,
} from "./checks/index.ts"
export { hash53 } from "./hash.ts"
export { placeablesOf, type Segment, segments } from "./highlight.ts"
export { type Merge, mergeMessage } from "./merge.ts"
export { patternText, plainOf, wordCount } from "./plain.ts"
export { type Preview, previews } from "./preview.ts"
export { composeBody } from "./shape/compose.ts"
export { fitShape, isEmpty, isPlural, pluralCategories } from "./shape/plural.ts"
export { type Field, type Part, parseBody, type Shape, shapeOf, type Variant } from "./shape/read.ts"
export {
  applyTransform,
  type GeneratedLanguage,
  type Transform,
  transformNames,
} from "./transliterate/index.ts"
export { messagesOf, patchMessages, type ReadFile, readFile, type Unit } from "./units.ts"
