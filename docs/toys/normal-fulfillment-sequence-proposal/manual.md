# NORM1 — Normal Fulfillment Sequence Proposal

## What this toy does

Normal Fulfillment Sequence Proposal builds the procurement-free transport, possession, pickup, inspection, and cleaning sequence around an existing possession interval. It returns geometry and timing only; it does not select assets, assign runners, check feasibility, persist data, or calculate cost.

## Input

Submit one JSON object with these properties:

- `possessionContext`: existing `segment`, `startPoint`, and `endPoint`; the segment endpoint IDs must match the points.
- `warehouse`: `spacePointId`, numeric `latitude`, and numeric `longitude`.
- `travelDurations`: non-negative `deliveryOutboundSeconds`, `deliveryReturnSeconds`, `pickupOutboundSeconds`, and `pickupReturnSeconds`.
- `configuration`: non-negative duration and buffer values for delivery, pickup, inspection, and cleaning.
- `generatedIds`: IDs for the six generated warehouse points and seven generated segments.

### Example

```json
{
  "possessionContext": {
    "segment": { "segmentId": "possession-1", "startPointId": "start-1", "endPointId": "end-1" },
    "startPoint": { "pointId": "start-1", "timestamp": "2026-08-23T10:00:00.000Z" },
    "endPoint": { "pointId": "end-1", "timestamp": "2026-08-23T11:00:00.000Z" }
  },
  "warehouse": { "spacePointId": "warehouse-1", "latitude": 52.52, "longitude": 13.405 },
  "travelDurations": { "deliveryOutboundSeconds": 600, "deliveryReturnSeconds": 600, "pickupOutboundSeconds": 600, "pickupReturnSeconds": 600 },
  "configuration": {
    "deliveryOutboundBufferSeconds": 60, "deliveryReturnBufferSeconds": 60,
    "pickupOutboundBufferSeconds": 60, "pickupReturnBufferSeconds": 60,
    "inspectionDurationSeconds": 600, "inspectionBufferSeconds": 60,
    "cleaningDurationSeconds": 600, "cleaningBufferSeconds": 60
  },
  "generatedIds": {
    "points": { "deliveryOutboundStart": "point-1", "deliveryReturnEnd": "point-2", "pickupOutboundStart": "point-3", "pickupReturnEnd": "point-4", "inspectionComplete": "point-5", "cleaningComplete": "point-6" },
    "segments": { "deliveryOutbound": "segment-1", "deliveryReturn": "segment-2", "pickupOutbound": "segment-3", "pickupReturn": "segment-4", "inspection": "segment-5", "cleaning": "segment-6" }
  }
}
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["possessionContext", "warehouse", "travelDurations", "configuration", "generatedIds"],
  "properties": {
    "possessionContext": { "type": "object" },
    "warehouse": { "type": "object" },
    "travelDurations": { "type": "object" },
    "configuration": { "type": "object" },
    "generatedIds": { "type": "object" }
  },
  "additionalProperties": false
}
```

## Output

On success, the toy returns `valid: true`, one warehouse space point, eight points, seven segments, seven ordered operation records, and the possession segment reference. On failure it returns `{ "valid": false, "error": "..." }` and does not persist or mutate anything.

### Example

```json
{"example": true}
```

## Behavior

The sequence is ordered as delivery outbound, delivery return, possession, pickup outbound, pickup return, inspection, and cleaning. Each generated timestamp is aligned to a whole minute. The possession points and segment are returned unchanged.

## How to use it

1. Submit the example above.
2. Inspect the ordered `sequence` and compare each operation’s `segmentId` with `segments`.
3. Change one duration or buffer and observe the affected timestamps.
4. Try a negative duration or mismatched endpoint ID to see structured failure behavior.

## Limitations

This toy proposes a deterministic candidate sequence. It does not prove that the sequence is feasible, reserve resources, select an asset, assign a runner, or model reliability.
