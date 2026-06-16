# MEMO1 — Memory Vector

## What this toy does

MEMO1 reads a selected memory value and returns it as a vector-shaped JSON response.

It is the simple memory vector inspector:

- arrays are preserved
- every non-array value is wrapped in a one-item vector
- objects are preserved as object values inside the vector

Use it when you want to inspect one memory value without mutating state.

## Input formats

MEMO1 accepts either a plain path string or a JSON object.

### Plain path string

```text
project.tasks
```

This reads from `temporary` memory by default.

### JSON object

```json
{
  "memoryLocation": "temporary",
  "path": "project.tasks"
}
```

You can also use `key` instead of `path`:

```json
{
  "memoryLocation": "temporary",
  "key": "project.tasks"
}
```

A JSON string is also accepted:

```json
"project.tasks"
```

## Supported memory locations

| `memoryLocation` | Meaning |
|---|---|
| `temporary` | Session/local temporary data |
| `permanent` | Persistent local permanent data |
| `envelope` | Full data envelope |

If `memoryLocation` is missing or empty, the toy uses `temporary`.

## Output format

The response contains:

- `memoryLocation`
- `path`
- `found`
- `vector`
- optional `error`

Example:

```json
{
  "memoryLocation": "temporary",
  "path": "demo.message",
  "found": true,
  "vector": ["Hello"]
}
```

## Projection behavior

### Scalar value

If the selected value is:

```json
"Hello"
```

The vector is:

```json
["Hello"]
```

### Array value

If the selected value is:

```json
["alpha", "beta"]
```

The vector is:

```json
["alpha", "beta"]
```

### Object value

If the selected value is:

```json
{
  "name": "Ada",
  "role": "programmer"
}
```

The vector is:

```json
[
  {
    "name": "Ada",
    "role": "programmer"
  }
]
```

MEMO1 does not convert objects into key-value pairs. Use MEMO2 for that.

## How to use it

1. Choose the memory location.
2. Enter the path you want to inspect.
3. Submit the input.
4. Read the returned vector.

## Example workflow

1. Write with MEMO3:

```json
{
  "memoryLocation": "temporary",
  "path": "demo.items",
  "value": ["alpha", "beta"]
}
```

2. Read with MEMO1:

```json
{
  "memoryLocation": "temporary",
  "path": "demo.items"
}
```

3. The vector should contain `alpha` and `beta`.

## Missing paths

MEMO1 treats missing paths as errors.

A missing path response has:

- `found: false`
- `vector: []`
- `error` with the path-resolution message

Use MEMO2 if you prefer missing paths to return an empty vector without an error.

## Tips

- Use MEMO1 when you want the exact selected value preserved.
- Use MEMO2 when you want object values projected into `{ key, value }` entries.
- Use plain paths for quick reads from temporary memory.
- Use JSON object input for permanent or envelope reads.

## Troubleshooting

### “Input must be a JSON object or a string path.”

The input parsed as JSON but was not a string or object.

### “Unsupported memoryLocation”

Use `temporary`, `permanent`, or `envelope`.

### The object did not become key-value pairs

That is expected in MEMO1. Use MEMO2 for key-value-pair projection.
