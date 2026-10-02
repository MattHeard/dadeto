# Assignment predicate policies

Asset and person predicate modules now configure one shared API factory in
assignmentRequests. It owns parser collections, identifier normalization and
boolean evaluation. Each module retains its exported parser, normalizer,
predicate, interval resolver and overlap helper. Policies preserve the asset
parser's grouped collection error versus the person's per-field errors.

Asset references require the direct Object.prototype; person references accept
other non-array records. A regression covers null/custom prototypes, owner-key
selection and callable records. The prototype predicate is shared with memory
vector parsing through browserToysCore, separately from its older
constructor-based isPlainObject helper, whose semantics must not be conflated.

The first extraction introduced type narrowing failures and new clone seams.
Moving the whole configurable parser workflow into one factory fixed those
issues more coherently than duplicating casts or adjusting source tokens.
tryOr's public return type is unknown; its predicate adapter explicitly narrows
the result because both callbacks produce strings. No suppression is needed.

Focused acceptance: test/toys/2026-08-20, test/toys/2026-05-28 and
test/toys/browserToysCore.branches.test.js. The run includes 194 tests with
exact 100% coverage in all four metrics for six changed source modules.
Artifacts: `.tmp/assignment-predicate-tests-accepted.log`,
`.tmp/assignment-predicate-static-accepted.log` and
`.tmp/assignment-predicate-cycles.log`. Full aggregate completion remains
owned by dadeto-aaou until the remaining duplication is eliminated.
