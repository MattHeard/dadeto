# Function dependency graph arity cleanup

- Unexpected hurdle: TSDoc first exposed that the resolver was annotated as receiving an AST node even though it reads function metadata; the first full check also caught malformed one-line JSDoc on the new call-context helper.
- Diagnosis: function registration mixed file-scoped state with per-node inputs, while call inspection rebuilt and unpacked the same six-field context for every AST node.
- Fix: create one registrar per file and pass node, parent, and anonymous index explicitly; create one named call-inspection context per caller and reuse it throughout traversal. Clarify the resolver's actual `file` input type and document the context helper conventionally.
- Evidence: focused graph suite passed (1 suite, 7 tests); scoped no-cache arity lint is empty; `npm run tsdoc:check` and `npm run lint` passed; elevated `npm run check` passed all ten checks. Fresh global inventory is 42 findings across 42 files. Artifact: `.tmp/parameter-bag-global-after-function-dependency.json`.
- Next time: continue with the one finding in `src/core/browser/game/chronoflow/chronoflow.js`.
