# Atlas additive identity references

Portable V6 research bundles carry a V3 identity graph. Its `identityReferences`
collection is an append-only list of versioned claims for entities that may not
be indexed when a submission arrives.
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

V3 identity graphs allow a missing target only when a claim matches the exact
entity type and ID and names the referring record in `sourceRecordId`. This
applies to activation-position components, observation positions and
experiments, structural-connection endpoints, and circuit snapshot members and
boundaries. Existing targets still undergo the V2 coordinate, checkpoint, and
snapshot-digest checks. A claim for a different record, entity type, or ID does
not satisfy the link. V2 graph validation remains strict.

V6 embeds the V3 graph in the research bundle. Research-service writes use V6;
V2–V5 imports remain supported and normalize their reference claims into the
service bundle shape. Direct V2–V5 export functions retain their original
envelope formats. V3 graph export sorts records and claims deterministically,
preserving unresolved identifiers and provenance through export/import. When
compatible identifying metadata arrives, the existing reference summary
resolves it without mutating earlier claims; incompatible descriptors remain
an explicit conflict.
