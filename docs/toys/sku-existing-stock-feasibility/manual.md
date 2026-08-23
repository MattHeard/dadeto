# SKUE1 — SKU Existing-Stock Feasibility

## What this toy does

Test matching assets for a requested SKU.

## Input

Submit requestedSku and assets.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object"
}
```

## Output

Returns a JSON feasibility result.

## Behavior

Matching assets are checked in deterministic order with no side effects.
