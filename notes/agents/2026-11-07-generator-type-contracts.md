# Generator typing prerequisite

Owning bead: `dadeto-xyth`; active Notion spec: [Typed logic architecture](https://app.notion.com/p/3ff700afc301811ab16fcfab82168d28).

Removing the generator's checkJs exclusion exposed missing post/body/media/link
contracts, lost payload relationships in callback registries, an incorrect banner
function annotation, optional toy-method results, and optional link metadata.
The old registry described normalization as `unknown -> NormalizedContent`,
although its identity rule could return any object. Pretending that operation
was a parser would hide the actual contract.

The generator now describes its supported authored data with structural JSDoc
and discriminated body entries. Dispatch preserves the relationship between
each entry type and its payload. Primitive legacy content still becomes text;
ordered entries and legacy media/toy/link ordering retain their behavior.
No `any`, unchecked assertion, source exclusion or lower threshold was added.
The banner annotation now describes its return value. The generator and five
direct presentation helpers participate in checkJs discovery.

The compiler regression in `test/scripts/generator-contract.test.js` checks both
discovery and valid/invalid callers, including table columns/source, media,
quotation payloads, unknown entry types, the required table renderer and the
possibly absent configured input method. Keep the small exported helper
contracts limited to fields those helpers consume.

## Evidence

- Initial `npm run tsdoc:check` failed after removing the six exclusions;
  structural contracts and dispatch changes make it pass with exit zero.
- `node --experimental-vm-modules node_modules/jest/bin/jest.js test/generator test/core/generator.test.js test/core/title.test.js --runInBand --coverage=false`
  initially passed 125 suites / 292 tests. The compiler regression separately
  passed both tests. These are focused results, not full-suite evidence.
- A read-only comparison imports the original generator from
  `git show e984e63f1b:src/core/build/generator.js` as a data module, rewriting
  relative static import URLs to the worktree's unchanged helper modules.
  Both versions render the same `src/build/blog.json` through the same static
  table adapter. All 204 posts produce byte-identical HTML: 709,372 bytes,
  SHA-256 `1d6161519352fc13f84a6d47dc160e7a47ff89a8c4a7b5e6d3fdc46bd1b6404b`.
  This compares the complete unformatted renderer output, including page shell,
  rather than selected snippets or a new snapshot blessed after editing.
- The first scoped coverage run exposed an unreachable object-return branch:
  `normalizePostBody` already selects object entries before calling the primitive
  normalizer. Removing that redundant check and narrowing its input to
  `TextValue` makes final scoped coverage pass at 100% for statements, branches,
  functions and lines in both generator and banner. The final focused run passes
  126 suites / 294 tests, including the compiler fixture; log
  `/tmp/dadeto-xyth-coverage-final.log`.
- `DADETO_CHECK_IMPACT_SHARD_SIZE=40 npm run check` exits one. Its full fallback
  test phase records one pre-existing ESLint-fixture cold-start timeout; the
  unchanged standalone fixture passes all ten tests in 7.388 seconds. Its static
  phase passes ten of eleven gates and fails only the separately owned audit.
  Preserve both failure summaries in `/tmp/dadeto-xyth-check.log`; do not claim
  an aggregate pass. Final static gates ran after the normalizer hardening.
- `docs/quality/generator-typing.stryker.config.mjs` runs the generator runtime
  suites against the complete module with static mutation enabled and a 100%
  threshold. Inspect its terminal report before claiming mutation success.

## Independent HTML contract

`test/fixtures/generator-typing/blog.json` contains ten representative authored
posts. Its complete-page and caller-wrapped fragment goldens are generated from
the original `e984e63f1b` generator, with relative imports resolved to unchanged
helpers and a deterministic table-renderer port. The current generator was
byte-compared with the original before either fixture was written. These are
pre-change expectations, not snapshots blessed from the new implementation.

- `complete.html`: 40,324 bytes, SHA-256
  `faa0682a45ab1516e461acb8fb59ecb89eb898bea9b4fd558925c3d5fb5e1bd5`.
- `fragments.html`: 23,075 bytes, SHA-256
  `727574020874ae6be64a0c2a0e7ceb15d989e6951d1d5b441f91e15f472c9a4a`.

The contract asserts exact HTML and input immutability, supported helper
defaults/overrides, original error classes/messages and dependency-error
propagation. Together with the existing related-links getter compatibility
suite, it covers the complete generator at all-four metrics 100%: 16 tests in
1.904 seconds, `/tmp/dadeto-xyth-contract-coverage-complete.log`.

The initial compact run reached 98.5% branch coverage. The missing cases were
the toy fallback when there is no links entry and the second related-links
getter returning an empty array. That getter proves the second array check is
observable under the existing API: retain the behavior rather than remove the
guard to make coverage easier. Add first-manual/first-quotation fixtures to
distinguish the first-content label state, plus incomplete toy configurations.

`docs/quality/generator-contract.stryker.config.mjs` retains the exact whole-module
mutation scope, static evaluation and 100% threshold while using this compact
contract. All prior runtime tests and the broad mutation configuration remain.
Both earlier experiments continue against their frozen snapshots. The new
report is `reports/mutation/generator-contract.json`; do not treat a running
process or a passing dry run as mutation acceptance.

The first compact mutation run terminated at 98.43%: 627 killed, one timeout,
ten survivors and 35 ignored. Preserve its report as
`reports/mutation/generator-contract.pre-hardening.json`. The survivors exposed
redundant checks after body normalization and duplicated empty-field state in
link escaping. Remove the unreachable checks and compose link fields directly,
preserving truthy getter read order. Numeric manual identifiers and falsy link
metadata now characterize the meaningful compatibility guards. The contract
still compares every output byte, but reports equality without constructing a
large HTML diff for each failed mutant. A fresh run must resolve the timeout;
the diagnostic change alone does not prove that it has.

All legacy mutation directives have now been removed from the generator. The
fresh complete-module run instruments 657 mutants, with no requested skips.
After this hardening, the focused suite passes 127 suites / 306 tests with all
four coverage metrics at 100% for generator and banner; see
`/tmp/dadeto-xyth-unsuppressed-focused.log`. Mutation acceptance remains pending
until the fresh report is terminal and inspected.

## Limits and next-time guidance

Existing runtime validation remains visible parent-spec work. These structural
contracts describe supported inputs;
they do not establish a total `unknown` parser or complete the source migration.
The source must not move until parse/thin-wrapper and remaining architecture
prerequisites are verified. Exact pushed Full Check, required fast aggregate,
build and scoped coverage results must be recorded before closing this bead.

The read-only sandbox blocks Jest cache creation and Node's git subprocess;
rerunning those operations with approved access resolves those environment
failures. Fresh dependency audit findings are separately owned by
`dadeto-2gx2`; preserve audit enforcement while repairing their dependency tree.


## Review dependency repair and current-main refresh

After explicit user approval to merge goal PRs, inspect the current candidate,
not only its old CI. Review identified missing selected-test inputs in the broad
mutation sandbox: `test/fixtures/generator-typing/**` and `infra/dendrite.css`.
The relocated Jest classifier also requires both destination logic namespaces.
Put all these copied inputs in the broad manifest and let the compact config
inherit them; keep mutation scope, static evaluation and thresholds unchanged.

Both actual initial-test-only runs pass after the repair: broad 221 tests and
compact 16 tests; `/tmp/dadeto-xyth-{review,compact}-bootstrap.log`. These are
bootstrap results, not new mutation scores. The retained complete 657/657-Killed
report still embeds the exact generator source, SHA-256
`c7f936d1762b3b34f940847f4f0637963d8b02b469e245ac240d264bc4ce189f`.
Current-main integration must preserve that identity and receive fresh Full Check
before merging. When adding selected tests, inspect their fixture/style reads;
a passing compact harness does not validate a broader sandbox's copied inputs.
