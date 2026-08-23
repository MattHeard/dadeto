# EXIS2 — Existing Asset Fulfillment Sequence Feasibility

## What this toy does

Test whether one asset can accommodate every asset-relevant segment in a normal fulfillment proposal.

## Input

Submit an asset with a stock-in point, a valid proposal, and resolved points and space points.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": { "asset": { "type": "object" }, "proposal": { "type": "object" } }
}
```

## Output

Returns `{ "feasible": true }` only when all five asset operations form one coherent world line.

## Behavior

EXIS2 checks delivery outbound, possession, pickup return, inspection, and cleaning together. It supersedes EXIS1 and performs no assignment or reservation.
Submit an asset with a stock-in point, a valid normal proposal, and resolved points and space points. EXIS2 evaluates delivery outbound, possession, pickup return, inspection, and cleaning together, so conflicts late in the sequence are rejected. It supersedes EXIS1 and performs no assignment or reservation.
