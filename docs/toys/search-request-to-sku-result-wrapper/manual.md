# OBJE2 — Search Request to SKU Result Wrapper

## What this toy does

Converts the supported search request into either one football SKU result or an empty result list.

## Input

Submit requestText, deliveryPoint, pickupPoint, and the injected feasibility inputs.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "requestText": { "type": "string" },
    "deliveryPoint": { "type": "object" },
    "pickupPoint": { "type": "object" }
  }
}
```

## Output

Returns `{ "valid": true, "results": [] }` or one SKU result.

### Example

```json
{"valid":true,"results":[{"skuId":"FOOTBALL"}]}
```

## Behavior

Unsupported text short-circuits; feasible search is read-only and contains no price or offer.
