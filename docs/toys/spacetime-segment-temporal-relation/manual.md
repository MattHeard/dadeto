# Toy Spec: Spacetime Segment Temporal Relation

## What this toy does

Classify the temporal relationship between two spacetime segments without applying business logic.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

JSON input. Submit a JSON value in the toy's input area. A minimal example is:

```json
{}
```

If a field is omitted, the toy applies its default behavior. Invalid values are rejected or normalized according to the limits below.

## Output

JSON output. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

```json
{}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: `disjoint`, `touching`, and `overlapping` temporal relations. Out of scope: spatial intersection, routing, domain participation, persistence, and scheduling.


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
