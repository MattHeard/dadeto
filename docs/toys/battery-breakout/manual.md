# Toy Spec: Battery Breakout

## What this toy does

Provide an original frame-stepped battery-balancing toy that persists state across submits and renders entirely through canvas shapes. Reuse the SOLA1 arcade pattern while making charge balancing the core mechanic instead of simple panel clearing.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

JSON text with optional canvas, paddle, orb, life, and reset fields. Submit a JSON value in the toy's input area. A minimal example is:

```json
{}
```

If a field is omitted, the toy applies its default behavior. Invalid values are rejected or normalized according to the limits below.

## Output

JSON text consumed by the `canvas-2d` presenter. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

```json
{}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: - Parse optional JSON configuration for canvas and paddle defaults. - Persist game state between submits. - Move the paddle with held input and trigger launch/pause/reset on rising edges. - Resolve paddle, wall, battery-cell, win, and lose conditions. - Render the scene as a shape-only canvas payload. Out of scope: - Async timers inside the toy. - Multiplayer or networked play. - Retained canvas presenter changes.

### Limits and assumptions

Assumptions: - The runtime provides `setLocalPermanentData`. - The browser can repeatedly submit the toy when auto-submit is enabled. Constraints: - The toy must stay deterministic for a given persisted state and input sequence. - The presentation must stay copyright-safe and original.

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
