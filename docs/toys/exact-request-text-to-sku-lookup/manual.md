# EXAC1 — Exact Request Text to SKU Lookup

## What this toy does

Maps exactly `football` to the POC football SKU.

## Input

Submit `{ "requestText": "football" }`.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": { "requestText": { "type": "string" } }
}
```

## Output

Returns a deterministic match and SKU identifier, or a no-match result.

### Example

```json
{"matched":true,"skuId":"FOOTBALL"}
```

## Behavior

Matching is exact and performs no fuzzy normalization or persistence.
