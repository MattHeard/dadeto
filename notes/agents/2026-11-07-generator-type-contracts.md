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

## Limits and next-time guidance

Existing runtime validation and legacy generator mutation directives remain
visible parent-spec work. These structural contracts describe supported inputs;
they do not establish a total `unknown` parser or complete the source migration.
The source must not move until parse/thin-wrapper and remaining architecture
prerequisites are verified. Exact pushed Full Check, required fast aggregate,
build and scoped coverage results must be recorded before closing this bead.

The read-only sandbox blocks Jest cache creation and Node's git subprocess;
rerunning those operations with approved access resolves those environment
failures. Fresh dependency audit findings are separately owned by
`dadeto-2gx2`; preserve audit enforcement while repairing their dependency tree.
