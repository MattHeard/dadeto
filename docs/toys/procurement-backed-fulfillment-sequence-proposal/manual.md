# Procurement-Backed Fulfillment Sequence Proposal

## What this toy does

Propose a complete candidate sequence when fulfillment begins without assuming ready warehouse stock.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

possession context, warehouse location, travel durations, configuration buffers, and caller-provided IDs. Submit a JSON value in the toy's input area. A minimal example is:

```json
{
  "possessionContext": {
    "segment": { "segmentId": "possession-1", "startPointId": "start-1", "endPointId": "end-1" },
    "startPoint": { "pointId": "start-1", "timestamp": "2026-08-22T10:00:00.000Z" },
    "endPoint": { "pointId": "end-1", "timestamp": "2026-08-22T11:00:00.000Z" }
  },
  "warehouse": { "latitude": "52.520000", "longitude": "13.405000" },
  "travelDurations": { "deliveryOutboundSeconds": 600, "pickupReturnSeconds": 600 },
  "configuration": {
    "procurementDuration": 600, "procurementBuffer": 60, "deliveryBuffer": 60,
    "pickupBuffer": 60, "inspectionDuration": 600, "inspectionBuffer": 60,
    "cleaningDuration": 600, "cleaningBuffer": 60
  },
  "generatedIds": {
    "warehouseSpacePointId": "warehouse-1",
    "points": { "procurementStart": "point-1", "stockReady": "point-2", "pickupReturn": "point-3", "inspectionComplete": "point-4", "cleaningComplete": "point-5" },
    "segments": { "procurement": "segment-1", "deliveryOutbound": "segment-2", "pickupReturn": "segment-3", "inspection": "segment-4", "cleaning": "segment-5" }
  }
}
```

If a field is omitted, the toy applies its default behavior. Invalid values are rejected or normalized according to the limits below.

## Exact property names

The input is a JSON object with five properties:

- `possessionContext`: contains `segment`, `startPoint`, and `endPoint`; the segment endpoint IDs must match the point IDs.
- `warehouse`: contains canonical decimal-string `latitude` and `longitude` coordinates.
- `travelDurations`: contains non-negative `deliveryOutboundSeconds` and `pickupReturnSeconds`.
- `configuration`: contains the eight non-negative duration and buffer properties shown in the example.
- `generatedIds`: contains `warehouseSpacePointId`, five point IDs under `points`, and five segment IDs under `segments`.

All generated IDs must be non-empty, unique, and distinct from the possession IDs. Timestamps must be valid and align to whole minutes.

## Output

warehouse space point, spacetime points, segments, and ordered operation metadata. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

```json
{}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: deterministic procurement, delivery, possession, pickup, inspection, and cleaning geometry and timing. Out of scope: persistence, assignment, feasibility, procurement execution, pricing, offers, and reliability claims.

### Limits and assumptions

Durations are finite, non-negative seconds. Generated timestamps align to the existing minute-resolution spacetime-point contract. Warehouse points reference one timeless space point.

## How to use it

1. Submit the minimal example to see the default result.
2. Change one input field at a time.
3. Submit the same input again to confirm deterministic behavior.
4. Try an omitted or invalid value to observe the fallback or rejection behavior.

## Troubleshooting

- If the input is rejected, check that it is valid JSON and uses the field names shown above.
- If a value is ignored, it may be omitted, outside the supported range, or normalized by the toy.
- If the output is empty, verify that the input contains the records, points, or configuration needed for this operation.
- Stateful toys may require the reset input described above to return to their initial state.
