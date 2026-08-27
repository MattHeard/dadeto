# PROC4 — Procurement-Backed Fulfillment Feasibility Composition

## What this toy does

Serially checks delivery outbound, procurement, and pickup return for the POC.

## Input

Submit possession points, durations, supplier availability, frozen now, runner schedule, and commitments.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deliveryPoint": { "type": "object" },
    "pickupPoint": { "type": "object" },
    "durations": { "type": "object" },
    "supplierAvailability": { "type": "object" },
    "runnerSchedule": { "type": "array" },
    "runnerCommitments": { "type": "array" },
    "nowTimestamp": { "type": "string" }
  }
}
```

## Output

Returns feasible only when all three blocking guards pass.

### Example

```json
{"feasible":true}
```

## Behavior

This is read-only and calculates no price, offer, assignment, or reservation.
