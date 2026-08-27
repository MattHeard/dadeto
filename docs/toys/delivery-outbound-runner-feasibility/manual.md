# DELI2 — Delivery Outbound Runner Feasibility

## What this toy does

Places a fixed-duration delivery ending at the requested delivery timestamp and checks runner coverage.

## Input

Submit deliveryPoint, deliveryDurationSeconds, runnerSchedule, and runnerCommitments.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deliveryPoint": { "type": "object" },
    "deliveryDurationSeconds": { "type": "number" },
    "runnerSchedule": { "type": "array" },
    "runnerCommitments": { "type": "array" }
  }
}
```

## Output

Returns the ephemeral candidate interval and feasibility.

### Example

```json
{"feasible":true,"startTimestamp":"2026-08-27T18:15:00.000Z","endTimestamp":"2026-08-27T19:00:00.000Z"}
```

## Behavior

Schedule containment is inclusive and overlapping commitments block the candidate.
