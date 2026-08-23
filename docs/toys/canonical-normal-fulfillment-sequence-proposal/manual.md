# CANO1 — Canonical Normal Fulfillment Sequence Proposal

## What this toy does

Consumes SPAC8-compatible space points and returns a self-contained seven-operation normal fulfillment proposal. It validates and canonicalizes spatial composition; it does not select resources or check feasibility.

## Input

Submit a JSON object containing `possessionContext`, `spacePoints`, `warehouse`, `travelDurations`, `configuration`, and `generatedIds`. The possession segment’s endpoint IDs must match its endpoint points; generated IDs must be unique.

### Example

```json
{
  "possessionContext": { "segment": {}, "startPoint": {}, "endPoint": {} },
  "spacePoints": [{ "spacePointId": "warehouse-1", "latitude": 52.52, "longitude": 13.405 }],
  "warehouse": { "spacePointId": "warehouse-1" },
  "travelDurations": {},
  "configuration": {},
  "generatedIds": { "points": {}, "segments": {} }
}
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["possessionContext", "spacePoints", "warehouse", "travelDurations", "configuration", "generatedIds"],
  "properties": {
    "possessionContext": { "type": "object" }, "spacePoints": { "type": "array" }, "warehouse": { "type": "object" },
    "travelDurations": { "type": "object" }, "configuration": { "type": "object" }, "generatedIds": { "type": "object" }
  },
  "additionalProperties": false
}
```

## Output

Returns deduplicated, sorted `spacePoints`, eight points, seven segments, seven ordered operation records, and the unchanged possession reference. Invalid composition returns a structured failure.

### Example

```json
{"example": true}
```

## Behavior

All generated points reference the canonical warehouse space point. Durations are finite and non-negative, and generated timestamps must align to whole minutes. The toy does not persist state, assign resources, calculate price, or prove feasibility.

## How to use it

Submit the example, then add a duplicate space point or change an ID to observe canonicalization and validation behavior.
