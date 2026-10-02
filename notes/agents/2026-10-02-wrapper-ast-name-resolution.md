# Wrapper AST name resolution

The tautological-wrapper rule duplicated identifier-name and property-name
inspection across declarations, assignments, object properties, callees and
imported bindings. One identifier reader now underpins these selectors, and
property/callee names share the same literal-or-identifier resolution.
Computed members remain excluded. Parameter matching uses a dense copy and
short-circuit every, retaining index-by-index behavior even for sparse arrays.

The module's blanket mutation-ignore block is removed. Existing rule fixtures
and helper shape checks plus a new computed-versus-direct import matrix pass:
15 tests, two suites, exact 100% statements/branches/functions/lines.
Artifacts: `.tmp/wrapper-names-tests-final.log` and
`.tmp/wrapper-names-static-final.log`.

Initial name consolidation changed clone boundaries without reducing the
global count. Sharing import-root recognition and parameter iteration reduced
the final strict minTokens 14 count from 154 to 152. All other static gates
passed; aggregate completion remains open in dadeto-aaou.
