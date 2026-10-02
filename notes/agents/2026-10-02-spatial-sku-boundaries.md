# Spatial normalization and SKU evaluation boundary

Registry records, referenced/legacy points and warehouse results now share
`normalizeSpatialCoordinates`. Warehouse fulfillment consumes the spatial
resolver's public normalization contract. Coordinate bounds, six-decimal output,
null behavior and output property order remain unchanged. Removed the resolver
blanket suppression and touched registry-record suppression blocks.

The spatial extraction removed its targeted import clone but exposed another
existing clone when suppressions were removed, leaving 123 initially. The shared
SKU boundary now accepts an optional serialization strategy rather than nesting
another asset adapter, reducing the final count to 122. A direct API regression
verifies the original unserialized asset/request callback and sorted asset order;
existing consumers cover the serialized strategy.

Final evidence: 134 toy suites / 1,219 tests pass; all three changed source
modules have exact 100% statements/branches/functions/lines
(`.tmp/spatial-sku-final-tests.log`, `.tmp/spatial-normalization-coverage`). Static
aggregate passes nine gates; duplication alone fails at 122 clones
(`.tmp/spatial-sku-final-static.log`). minTokens remains 14; no exemptions,
exceptions or ignore pragmas were introduced.
