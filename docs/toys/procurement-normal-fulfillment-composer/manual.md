# FULF1 — Procurement Normal Fulfillment Composer

## What this toy does

Prepends one validated warehouse-procurement prefix to one validated canonical normal-fulfillment proposal. It composes the two existing results without recalculating their timings.

## Input

Submit a JSON object with `procurementProposal` and `normalProposal`. Each property contains the corresponding validated proposal object.

```json
{
  "procurementProposal": { "valid": true, "spacePoints": [], "points": [], "segments": [], "sequence": [] },
  "normalProposal": { "valid": true, "spacePoints": [], "points": [], "segments": [], "sequence": [] }
}
```

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["procurementProposal", "normalProposal"],
  "properties": { "procurementProposal": { "type": "object" }, "normalProposal": { "type": "object" } },
  "additionalProperties": false
}
```

## Output

Returns one composed proposal containing the procurement prefix followed by the normal proposal’s points, segments, and ordered operations. Invalid or incompatible components return a structured failure.

## Behavior

The toy does not execute procurement, persist data, assign resources, recalculate durations, or prove feasibility. It only validates the two supplied components and composes them deterministically.

## How to use it

1. Produce valid procurement and normal proposals.
2. Submit them under the two required properties.
3. Inspect the resulting operation order and shared point references.
