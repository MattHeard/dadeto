# Atlas additive identity references

Portable V5 research bundles carry `identityReferences`, an append-only list of
versioned claims for entities that may not be indexed when a submission arrives.
Each claim retains its typed entity ID, author, source, optional source-record
ID, and recording time. Model, checkpoint, component, activation-position,
observation, experiment, structural-connection, circuit, circuit-snapshot, and
other references have distinct entity types.

`submitIdentityReference` validates and stores a claim through the injected
research-bundle store. `readIdentityReferences` groups claims by type and
original ID and reports `unresolved` when no identity descriptor is known,
`resolved` when exactly one distinct descriptor is present, and `conflict` when
multiple descriptors disagree. The summary is derived; original claims and
their provenance remain unchanged. Canonical V2 component IDs are parsed and
checked against an optional JSON-encoded structured identity descriptor.

V2, V3, and V4 bundle imports remain supported and initialize the reference
collection as empty. Research-service writes use V5, carrying forward evidence,
identity records, mechanism links, evaluations, and references. Direct V2–V4
export functions retain their original envelope shapes.

This slice establishes an additive reference ledger and service round trip. The
identity graph's existing V2 relationships still require indexed components,
positions, connections, and circuits. The next implementation step is a
versioned graph representation that can point to these claims while targets
are unresolved, then resolve those links without rewriting earlier evidence.
