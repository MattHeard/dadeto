# Atlas Research Context — Field Guide

## What this toy does

Atlas retrieves a reproducible view of hypotheses, experiments, evidence, and typed relationships linked to a mechanism. The context API is a pure library surface over a validated portable research bundle; this slice does not expose a hosted endpoint or charge for use.

## Input

Call `getEvidenceGraphContextSnapshotV1(graph, query, hash)` with a validated evidence graph, a mechanism ID, and a caller-supplied pure digest adapter. `pageSize` limits one response page. `maxItems` limits each traversable context window. Continue with `nextCursor` for another page in the current window, then `continuationCursor` for the next window when present. The service method `readContextSnapshot(allowEffects, query)` loads its bundle through the injected storage adapter and forwards the permission only to that storage boundary.

### Example

```json
{
  "mechanismId": "mechanism-a",
  "maxDepth": 2,
  "pageSize": 20,
  "maxItems": 200
}
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["mechanismId"],
  "properties": {
    "mechanismId": { "type": "string", "minLength": 1 },
    "maxDepth": { "type": "integer", "minimum": 1, "maximum": 4 },
    "pageSize": { "type": "integer", "minimum": 1, "maximum": 100 },
    "maxItems": { "type": "integer", "minimum": 1, "maximum": 1000 },
    "cursor": {
      "type": ["object", "null"],
      "required": ["snapshotId", "offset", "windowStart", "windowEnd"],
      "properties": {
        "snapshotId": { "type": "string", "minLength": 1 },
        "offset": { "type": "integer", "minimum": 0 },
        "windowStart": { "type": "integer", "minimum": 0 },
        "windowEnd": { "type": "integer", "minimum": 0 }
      }
    }
  },
  "additionalProperties": false
}
```

## Output

The response contains ordered typed records and edges, warning metadata, `totalItems`, and a content-derived `snapshotId`. A page's `nextCursor` advances inside its current bounded window. `continuationCursor` moves to the next window when context exceeds the item bound. `contextStatus` identifies whether more context remains. Invalid bounds, unknown mechanisms, changed snapshots, and invalid digests return explicit errors.

### Example

```json
{
  "valid": true,
  "snapshotId": "atlas:context:v1:sha256-example",
  "totalItems": 12,
  "contextStatus": "complete",
  "items": [],
  "nextCursor": null,
  "continuationCursor": null,
  "warnings": []
}
```

## Behavior

Context records and edges are traversed deterministically and returned once in stable order. The snapshot digest covers the mechanism, depth, complete reachable context, and warnings; object keys are canonicalized before hashing. Negative, null, and contradictory evidence remain available with their provenance. Page sizing does not alter snapshot identity. A source change produces a different ID, so a prior cursor cannot silently continue against changed content. Hashing is injected and pure; `AllowEffects` is used only to load a stored bundle.

The context snapshot is one Atlas slice. It does not create experiment-design records, persist proposals, execute a model, or add a hosted/GCP service.
