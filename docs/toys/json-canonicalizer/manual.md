# Toy Spec: JSON Canonicalizer

## What this toy does

Accept any valid JSON value and return a stable, pretty-printed JSON string. Normalize object key ordering so equivalent JSON values always render the same way.

This manual explains the behavior a user can observe by submitting input to the toy. The toy is synchronous and deterministic unless the behavior below says that it persists state or advances between submissions.

## Input

A JSON string containing any valid JSON value. Submit a JSON value in the toy's input area. A minimal example is:

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

- `JSON1`

Unknown properties are ignored. Required properties and nested fields are described in the behavior above.

## Output

A pretty-printed canonical JSON string or a structured parse error. The result is returned as JSON or rendered by the toy's configured presenter. A representative result is:

### Example

```json
{"result":"representative toy result"}
```

The result contains the normalized values and any status, summary, proposal, predicate result, or rendered payload produced by this toy.

## Behavior

In scope: - Parse a JSON string input. - Canonically sort object keys at every nesting level. - Preserve array order and scalar values. - Emit pretty-printed JSON with a stable indentation style. Out of scope: - JSON5, comments, trailing commas, or any non-JSON syntax. - Schema validation or semantic normalization beyond key ordering. - Browser storage, network access, or async behavior.

### Limits and assumptions

Assumptions: - Deterministic object key order is enough to make equivalent values comparable. - Pretty printing should use a fixed two-space indent. Constraints: - The toy must stay synchronous. - The toy must not mutate the parsed input value.

## How to use it

1. Submit the minimal example to see the default result.
2. Change one input field at a time.
3. Submit the same input again to confirm deterministic behavior.
4. Try an omitted or invalid value to observe the fallback or rejection behavior.

## Use it from an agent

Dadeto registers the `dadeto_canonicalize_json` WebMCP tool on pages open in a
browser that supports `document.modelContext`. The tool accepts one string,
`input`, and calls the same allowlisted JSON1 capability used by Dadeto's local
HTTP adapter. It does not accept module names, paths, or export names.

To inspect the tool locally, run `npm run build` and `npm run start`, then open
the generated Dadeto site in a WebMCP-enabled browser. Ask the connected agent,
“Canonicalize this JSON for me: {\"b\":2,\"a\":1}”. The expected result is:

```json
{
  "a": 1,
  "b": 2
}
```

For malformed JSON, JSON1 returns its existing structured error as text.

## Troubleshooting

- If the input is rejected, check that it is valid JSON and uses the field names shown above.
- If a value is ignored, it may be omitted, outside the supported range, or normalized by the toy.
- If the output is empty, verify that the input contains the records, points, or configuration needed for this operation.
- Stateful toys may require the reset input described above to return to their initial state.
