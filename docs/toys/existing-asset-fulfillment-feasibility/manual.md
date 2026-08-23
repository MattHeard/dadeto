# EXIS1 — Existing Asset Fulfillment Feasibility

## What this toy does

Test one asset against a normal fulfillment proposal.

## Input

Submit an object containing asset, proposal, points, and spacePoints.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object"
}
```

## Output

Returns a JSON feasibility result.

## Behavior

The calculation is deterministic and has no side effects.
