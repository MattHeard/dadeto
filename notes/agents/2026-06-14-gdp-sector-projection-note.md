Unexpected hurdle: the new GDP toy looked done in focused tests, but repo coverage stayed short on two branches and one presenter fallback path.

Diagnosis path: I checked the exact uncovered line numbers from `npm test`, then added regressions for object-shaped input with and without `rows`, invalid rows that survive JSON encoding, and a presenter case that skips empty series while still exercising the default line-color path.

Chosen fix: split the toy parsing and projection helpers a bit further, then extended the graph presenter tests to cover the fallback branch without changing render behavior.

Next time: when a new toy adds a new payload shape, add the coverage edge cases up front for both the parser and the renderer fallback before running the full suite.
