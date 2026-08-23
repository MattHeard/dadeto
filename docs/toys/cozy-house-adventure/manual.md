# Cozy House Adventure Spec

## What this toy does

Provide a relaxing text adventure toy that models tiny-house construction with small, readable command loops.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

free-text commands such as `build`, `foundation`, `level soil`, `plant herbs`. Submit a JSON value in the toy's input area. A minimal example is:

### Example

```json
{
  "build": null,
  "foundation": null
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

The input is a JSON object. These are the property names read by this toy:

- `inventory`
- `progress`
- `temporary`

Unknown properties are ignored unless the behavior described above says otherwise.

## Output

narrative response strings and progress prompts. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

### Example

```json
{"result":"representative toy result"}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: - Name capture and start prompt. - Multi-step build loop for foundation/materials/roof/garden. - Temporary progression persistence under `temporary.COZY1`. Out of scope: - New UI presenters. - Multiplayer state. - Persisting game progress to permanent storage.

### Limits and assumptions

Assumptions: - Runtime provides `getData`, `setLocalTemporaryData`, `getCurrentTime`, and `getRandomNumber`. Constraints: - Toy must remain synchronous and return text. - State key must not collide with existing toy keys.

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
