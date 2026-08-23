# Toy Spec: JSON Parse Error Explainer

## What this toy does

Accept malformed JSON and return a structured error object instead of throwing. Surface enough context for a user to understand where parsing broke.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

A JSON string, valid or malformed. Submit a JSON value in the toy's input area. A minimal example is:

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

The input is a JSON object with these property names:

- `JSON2`

Unknown properties are ignored. Required properties and nested fields are described in the behavior above.

## Output

A JSON string containing either the parsed value or a structured error object. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

### Example

```json
{"result":"representative toy result"}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: - Parse a JSON string input. - Return the parsed value on success. - Return a structured error object on failure with message, approximate failure location, and original input length. Out of scope: - JSON repair or automatic correction. - Schema validation or semantic interpretation. - Browser storage, network access, or async behavior.

### Limits and assumptions

Assumptions: - Native `JSON.parse` error messages are sufficient to derive an approximate location when available. - Returning the original input length is enough to help identify truncation or paste issues. Constraints: - The toy must stay synchronous. - The toy must not mutate the input string.

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
