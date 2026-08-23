# PROC2 — Procurement Prefix Proposal

## What this toy does

Builds the warehouse procurement and candidate stock-in prefix immediately before an existing delivery-outbound start point. It proposes geometry and timing only.

## Input

Submit the JSON object accepted by the toy: an existing delivery start point, warehouse location, procurement duration and buffer, and generated point and segment IDs.

### Example

```json
{
  "deliveryOutboundStart": { "pointId": "delivery-start", "timestamp": "2026-08-23T10:00:00.000Z" },
  "warehouse": { "spacePointId": "warehouse-1", "latitude": 52.52, "longitude": 13.405 },
  "procurementDurationSeconds": 600,
  "procurementBufferSeconds": 60,
  "generatedIds": { "procurementStartPointId": "procurement-start", "stockReadyPointId": "stock-ready", "procurementSegmentId": "procurement-1" }
}
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["deliveryOutboundStart", "warehouse", "procurementDurationSeconds", "procurementBufferSeconds", "generatedIds"],
  "properties": {
    "deliveryOutboundStart": { "type": "object" }, "warehouse": { "type": "object" },
    "procurementDurationSeconds": { "type": "number", "minimum": 0 }, "procurementBufferSeconds": { "type": "number", "minimum": 0 },
    "generatedIds": { "type": "object" }
  },
  "additionalProperties": false
}
```

## Output

Returns the warehouse space point, procurement-start and stock-ready points, and one procurement segment that ends at the existing delivery start. Invalid durations, coordinates, IDs, or timestamps return a structured failure.

### Example

```json
{"example": true}
```

## Behavior

The allocated procurement time is the base duration plus the buffer. Resulting timestamps must align to whole minutes. The toy performs no procurement, persistence, assignment, feasibility, or pricing.

## How to use it

Submit the example, then change the duration or buffer and observe the proposed procurement start. Keep the existing delivery-start timestamp fixed to see the prefix move earlier.
