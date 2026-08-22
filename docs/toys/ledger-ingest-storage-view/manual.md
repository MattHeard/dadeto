# Ledger Ingest Permanent Data View

## What this toy does

Provide a read-only way to inspect the LEDG3 permanent storage bucket in the same table style used by the ledger ingest report presenter.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

Optional JSON settings, currently limited to selecting the storage bucket key. Submit a JSON value in the toy's input area. A minimal example is:

```json
{}
```

If a field is omitted, the toy applies its default behavior. Invalid values are rejected or normalized according to the limits below.

## Exact property names

The input is a JSON object with these property names:

- `getLocalPermanentData`
- `setLocalPermanentData`

Unknown properties are ignored. Required properties and nested fields are described in the behavior above.

## Output

JSON report shaped for the ledger-ingest presenter. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

```json
{}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: Read the LEDG3 permanent storage bucket. Render the stored transactions through the existing ledger-ingest presenter. Keep the toy read-only. Out of scope: Mutating permanent storage. Re-importing ledger data. Changing the canonical transaction merge policy.

### Limits and assumptions

Assumptions: LEDG3 is the bucket key used by the storage toy. The existing ledger-ingest presenter can render a report object that includes canonical transactions. Constraints: The toy must not call `setLocalPermanentData`.

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
