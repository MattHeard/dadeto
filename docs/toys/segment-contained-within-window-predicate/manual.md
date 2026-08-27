# SEGM3 — Segment Contained Within Window Predicate

## What this toy does

Checks whether a complete interval fits within an availability window.

## Input

Submit four ISO timestamp strings: segment start/end and window start/end.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "segmentStartTimestamp": { "type": "string" },
    "segmentEndTimestamp": { "type": "string" },
    "windowStartTimestamp": { "type": "string" },
    "windowEndTimestamp": { "type": "string" }
  }
}
```

## Output

Returns `{ "feasible": true }` or false.

### Example

```json
{"feasible":true}
```

## Behavior

Both boundaries are inclusive; malformed or reversed intervals fail.
