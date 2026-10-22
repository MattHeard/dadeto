# AlgZoo published seed map

## Unexpected hurdle

The first seed-map generator kept bundle construction in `src/local` and grew
past the repository's 50-line thin-wrapper limit. Moving it into core exposed
strict JSDoc checks and the clone gate: generic fixture types hid the replay
tensors, optional component lookup was not narrowed, and repeated destructured
argument bags were reported as clones.

## Diagnosis and fix

Keep file reads and SHA-256 injection in the small `src/local` adapter. Put
deterministic V3 graph construction in
`src/core/local/algZooPublishedSeedMapCore.js`, with an explicit pinned-fixture
shape and typed neuron/activation-position records. Resolve components through
a map and throw for a missing identity. Use positional helper arguments where
the repeated destructuring added no value. The checked-in JSON is regenerated
by `node src/local/create-algzoo-seed-map.js`; its round-trip test supplies the
local test Zod implementation and does not require the production `zod`
package.

## Source and uncertainty

The portable map contains ARC's five published approximate hypotheses for
neurons 1, 2, 4, 6, and 7, each with its source URL, proposed status, rescaling
and approximate-isolation assumptions, and an explicit unquantified-error
caveat. The remaining eleven neurons have no functional claims. This is cited
source background, not a claim that the replay independently validates those
interpretations.

## Verification

The focused test passed (1 suite / 1 test); `npm run lint`, `npm run duplication`
(0 clones), `npm run tsdoc:check`, and `npm run build` passed. The pinned
artifact was regenerated successfully with production Zod. Final `npm run
check` passed all 10 gates, including the conservative five-shard fallback
(979 suites / 6,856 tests).

## Next-time guidance

For generated exports, make the generator deterministic and keep the checked-in
artifact byte-comparable to output. Use test doubles for injected schema
libraries so tests cover the boundary without requiring an optional production
dependency. Check clone and type gates immediately after moving logic into
`src/core`; fixing those before the aggregate gate avoids an unnecessary full
five-shard retry.
