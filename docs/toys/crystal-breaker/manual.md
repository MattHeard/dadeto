# Toy Spec: Crystal Breaker

## What this toy does

Exercise the SOLA1/Battery Breakout frame-stepped pattern while adding a first-class text HUD and multi-hit crystal targets.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

keyboard capture and generic gamepad/Joy-Con capture mapped inside the toy. Submit a JSON value in the toy's input area. A minimal example is:

### Example

```json
{"result":"representative toy result"}
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

The input is a JSON object. These are the property names read by this toy:

- `actions`
- `axes`
- `buttons`
- `gamepad`
- `height`
- `keyboard`
- `launchPressed`
- `moveLeft`
- `moveRight`
- `pausePressed`
- `previousActions`
- `radius`
- `resetPressed`
- `speed`
- `stuckToPaddle`
- `version`
- `vx`
- `vy`
- `width`
- `x`
- `y`

Unknown properties are ignored unless the behavior described above says otherwise.

## Output

canvas-2d payload with rect, circle, line, and text shapes. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

### Example

```json
{"result":"representative toy result"}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: Paddle movement, orb launch, deterministic collisions, crystal hp/fracture/shatter transitions, score/lives/status HUD, persisted bounded state. Out of scope: Asynchronous timers, copied commercial layouts, sound, bitmap sprites, retained canvas, networked state, multiplayer.

### Limits and assumptions

Assumptions: the toy runs in the existing DADETO one-frame submit loop. Constraints: state must stay bounded and recover from malformed input or persisted storage.

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
