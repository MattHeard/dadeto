# PICK2 — Pickup Return Runner Feasibility

## What this toy does

Places a fixed-duration pickup return starting at the requested pickup timestamp.

## Input

Submit pickupPoint, pickupDurationSeconds, runnerSchedule, and runnerCommitments.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pickupPoint": { "type": "object" },
    "pickupDurationSeconds": { "type": "number" },
    "runnerSchedule": { "type": "array" },
    "runnerCommitments": { "type": "array" }
  }
}
```

## Output

Returns the ephemeral candidate interval and feasibility.

### Example

```json
{"feasible":true,"startTimestamp":"2026-08-27T20:00:00.000Z","endTimestamp":"2026-08-27T20:45:00.000Z"}
```

## Behavior

The complete return interval must fit the runner schedule and avoid commitments.
