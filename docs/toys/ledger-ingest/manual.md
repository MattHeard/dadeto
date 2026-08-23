# Ledger Ingest Toy

## What this toy does

Define and document the pure, deterministic core contract for importing raw exports into a canonical ledger without hiding adapters or IO.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

`ImportTransactionsInput` (source label, explicit field mapping, rawRecords array, dedupe policy knobs). Submit a JSON value in the toy's input area. A minimal example is:

### Example

```json
{
  "ImportTransactionsInput": null
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

- `dedupePolicy`
- `fieldMapping`
- `fixture`
- `rawRecords`
- `source`

Unknown properties are ignored unless the behavior described above says otherwise.

## Output

`ImportTransactionsOutput` (canonical transactions, duplicate reports, policy/summary metadata consumed by adapters or tests). The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

### Example

```json
{"result":"representative toy result"}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: - Explicit `ImportTransactionsInput`/`ImportTransactionsOutput` schemas. - Normalization examples (dates, amounts, descriptions) and dedupe key policy. - At least two fixtures that prove normalization, dedupe, and summary behavior. - Structured error reporting for rows that are missing required fields so adapters can react without crashing. - Tests that read the fixtures and validate the core behavior without relying on adapters. Out of scope: - CSV parsing, database writes, network calls, adapter orchestration, or UI layers. - Encrypting, persistence, or credential management that belongs to downstream systems.

### Limits and assumptions

Assumptions: - Adapters provide solid raw JSON rows and deliver the field names referenced in `fieldMapping`. - Normalization steps (dates -> ISO, amounts -> signed numbers, descriptions -> trimmed lower-case) are sufficient for early dedupe. - Duplicate detection is first-wins so adapters can rely on policy reporting rather than silent overwrites. Constraints: - The core must stay pure (no filesystem, DB, or network calls). - All inputs/outputs remain JSON serializable. - Behavior must be deterministic so fixtures remain reliable across runs.

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
