# Toy Spec: Object-minute Asset Registry

## What this toy does

Prove the smallest inventory primitive needed to offer a physical object for timed possession.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

JSON object containing an `assets` array. Submit a JSON value in the toy's input area. A minimal example is:

```json
{
  "assets": null
}
```

If a field is omitted, the toy applies its default behavior. Invalid values are rejected or normalized according to the limits below.

## Exact property names

The input is a JSON object. These are the property names read by this toy:

- `assets`

Unknown properties are ignored unless the behavior described above says otherwise.

## Output

JSON object containing normalized `assets` and `summary`. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

```json
{}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: normalize physical assets, apply safe defaults, sort deterministically, and summarize inventory. Out of scope: persistence, authentication, reservations, logistics, pricing, and mutation.

### Limits and assumptions

Asset IDs are stable physical identifiers. Missing optional fields receive explicit defaults. The toy is synchronous, pure, and deterministic.

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
