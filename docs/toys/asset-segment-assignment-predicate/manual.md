# Toy Spec: Asset Segment Assignment Predicate

## What this toy does

Determine whether a proposed asset-to-segment reference can be appended without assigning overlapping time to the same asset.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

JSON input. Submit a JSON value in the toy's input area. A minimal example is:

```json
{}
```

If a field is omitted, the toy applies its default behavior. Invalid values are rejected or normalized according to the limits below.

## Exact property names

The input is a JSON object. These are the property names read by this toy:

- `assignments`
- `points`
- `proposedAssignment`
- `segments`

Unknown properties are ignored unless the behavior described above says otherwise.

## Output

JSON output. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

```json
{}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

The toy performs only the focused operation described above. It does not add persistence, network access, scheduling, or unrelated business rules.


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
