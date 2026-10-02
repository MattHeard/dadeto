# Browser composition cycles (dadeto-cxxw)

Madge found two runtime import cycles: browser-core/common and
browser-core/createDendriteHandler. The Dendrite builder depended on utilities
from the module that also instantiated it.

The public browser-core facade now composes Dendrite handlers and reexports
browserUtilities. Dendrite imports that lower-level module, which imports
tryOr directly from commonCore. Existing utility implementations are moved,
not duplicated. A regression verifies that every utility export retains its
identity through the public facade.

Architecture acceptance command:
`node node_modules/madge/bin/cli.js --circular --extensions js src`.
Before: two cycles. After: no circular dependency found. Detailed local
evidence is in `.tmp/cxxw-cycles-before.log`, `.tmp/cxxw-cycles-after.log`,
and `.tmp/cxxw-tests.log`. Keep composition imports out of browserUtilities
and input handler implementations when adding new widgets.
