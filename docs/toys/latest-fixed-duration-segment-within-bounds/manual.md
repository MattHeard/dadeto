# LATE2 — Latest Fixed-Duration Segment Within Bounds

## What this toy does

Places a fixed-duration interval as late as possible within an earliest start and latest end.

## Input

Submit durationSeconds and two ISO timestamp bounds.

### Example

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "durationSeconds": { "type": "number" },
    "earliestStartTimestamp": { "type": "string" },
    "latestEndTimestamp": { "type": "string" }
  }
}
```

## Output

Returns feasible start/end timestamps or a no-placement result.

### Example

```json
{"feasible":true,"startTimestamp":"2026-08-27T10:30:00.000Z","endTimestamp":"2026-08-27T11:00:00.000Z"}
```

## Behavior

Duration is never shortened and invalid values are rejected.
