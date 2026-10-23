# Atlas additive identity graph V3

- Unexpected hurdle: persisted V1 identity-reference claims lived beside the graph, while graph entities use separate V2 schemas and strict linked-record validation.
- Diagnosis: letting V2 links accept missing targets would weaken existing imports and could conflate components, activation positions, observations, and experiments.
- Fix: add a distinct V3 portable graph and V6 research bundle. Missing links are accepted only with a typed, source-bound claim; V2 remains strict, and known identities retain canonical checks.
- Next-time guidance: keep unresolved references attributable to the source record, test each typed relationship independently, and preserve the original claim when later resolution or conflicts are reported. Validate component and circuit snapshot semantics before making broader acceptance claims.
- Evidence: `identityGraphReferencesV3.test.js` covers typed missing links, V2 strictness, deterministic bundle round trips, compatible later resolution, explicit conflict state, and unchanged prior references. `npm run check` passed all 10 local gates across six serial shards; exact-head CI is still required.
