# PROC3 — Procurement Segment Feasibility

## What this toy does

Places the fixed procurement interval as late as possible before delivery outbound.

## Input

Submit procurement duration, now, delivery start, supplier availability, runner schedule, and commitments.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "procurementDurationSeconds": { "type": "number" },
    "nowTimestamp": { "type": "string" },
    "deliveryOutboundStartTimestamp": { "type": "string" },
    "supplierAvailability": { "type": "object" },
    "runnerSchedule": { "type": "array" },
    "runnerCommitments": { "type": "array" }
  }
}
```

## Output

Returns an ephemeral procurement interval and feasibility.

### Example

```json
{"feasible":true,"startTimestamp":"2026-08-27T16:30:00.000Z","endTimestamp":"2026-08-27T17:00:00.000Z"}
```

## Behavior

The interval must fit supplier hours, frozen now, the runner schedule, and commitments.
