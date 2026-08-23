# SKUF1 — SKU Fulfillment Feasibility

## What this toy does

Combine two precomputed feasibility branches.

## Input

Submit procurementFeasible and existingStockFeasible.

### Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object"
}
```

### Schema

```json
{"type":"object"}
```

## Output

Returns the combined feasibility result.

### Example

```json
{"example": true}
```

## Behavior

The result is true when either branch is true.
