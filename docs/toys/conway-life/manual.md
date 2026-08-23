# Toy Spec: Conway Life

## What this toy does

Provide a small Game of Life engine that persists its board and tick speed in local storage. Exercise the browser's auto-submit loop and the canvas-2d presenter with a stateful, frame-stepped toy.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

A JSON string with optional `width`, `height`, `cols`, `rows`, `tickSpeedMs`, `cells`, and `reset`. Submit a JSON value in the toy's input area. A minimal example is:

### Example

```json
{
  "width": null,
  "height": null,
  "cols": null,
  "rows": null,
  "tickSpeedMs": null,
  "cells": null,
  "reset": false
}
```

If a field is omitted, the toy applies its default behavior. Invalid values are rejected or normalized according to the limits below.

### Schema

This machine-readable schema describes the public input shape. It does not include blog identifiers or runtime helpers.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```

## Exact property names

The input is a JSON object with these property names:

- `CONW1`
- `cells`
- `cols`
- `height`
- `reset`
- `rows`
- `setLocalPermanentData`
- `tickSpeedMs`
- `width`

Unknown properties are ignored. Required properties and nested fields are described in the behavior above.

## Output

A JSON string consumed by the `canvas-2d` presenter. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

### Example

```json
{"result":"representative toy result"}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: - Parse optional JSON configuration for dimensions, tick speed, and optional seed cells. - Persist board state in local storage across submits. - Advance the board once per auto-submit frame when the checkbox is enabled. - Render the board as a canvas payload. Out of scope: - Pointer editing of cells. - Async timers inside the toy. - Multiplayer or networked simulation.

### Limits and assumptions

Assumptions: - The runtime provides `setLocalPermanentData`. - The browser auto-submit loop is enabled for frame stepping. Constraints: - The toy must remain synchronous. - State must survive page refreshes through local storage.

## How to use it

1. Submit the minimal example to see the default result.
2. Change one input field at a time.
3. Submit the same input again to confirm deterministic behavior.
4. Try an omitted or invalid value to observe the fallback or rejection behavior.

## Troubleshooting

- If the input is rejected, check that it is valid JSON and uses the field names shown above.
- If a value is ignored, it may be omitted, outside the supported range, or normalized by the toy.
- If the output is empty, verify that the input contains the records, points, or configuration needed for this operation.
- Stateful toys may require the reset input described above to return to their initial state.
