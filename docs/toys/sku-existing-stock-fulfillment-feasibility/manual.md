# SKUE2 — SKU Existing-Stock Fulfillment Feasibility

## What this toy does

Test whether at least one existing asset for a requested SKU supports a complete fulfillment sequence.

## Input

Submit requestedSku, assets, proposal, points, and spacePoints.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": { "requestedSku": { "type": "string" }, "assets": { "type": "array" } }
}
```

## Output

Returns `{ "feasible": true }` when one matching asset succeeds, otherwise false.

## Behavior

SKUE2 checks exact-SKU assets in deterministic ID order using EXIS2 and stops on success. It creates no reservation.
Submit a requested SKU, asset candidates, and one normal fulfillment proposal. SKUE2 checks exact-SKU assets in deterministic ID order using EXIS2 and stops when one complete asset sequence succeeds. It reports only SKU feasibility and creates no reservation.
