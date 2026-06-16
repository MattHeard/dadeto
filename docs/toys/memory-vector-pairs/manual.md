# MEMO2 — Memory Vector

## What this toy does

MEMO2 reads a selected memory value and returns it as a vector-shaped JSON response.

It is the key-value-pair variant of the memory vector tool:

- arrays are preserved
- scalars are wrapped in a one-item vector
- objects are projected into `{ key, value }` pairs

This makes it useful for inspecting object-like memory containers.

## Input formats

MEMO2 accepts either a plain path string or a JSON object.

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
    "key": "name",
    "value": "Ada"
  },
  {
    "key": "role",
    "value": "programmer"
  }
]
```

## Example workflow

1. Use MEMO3 to write a value:

```json
{
  "memoryLocation": "temporary",
  "path": "demo",
  "value": ["alpha", "beta"]
}
```

2. Use MEMO2 to read it:

```json
{
  "memoryLocation": "temporary",
  "path": "demo"
}
```

3. Inspect the returned vector.

## Missing paths

If a path segment is missing, MEMO2 returns:

```json
{
  "memoryLocation": "temporary",
  "path": "missing.path",
  "found": false,
  "vector": []
}
```

This makes MEMO2 convenient for safe inspection when you are not sure whether a path exists.

## Tips

- Use MEMO2 when you want object values displayed as key-value rows.
- Use MEMO1 when you want object values preserved as a single item.
- Use a plain path string for quick temporary-memory lookups.
- Use a JSON object when you need `permanent` or `envelope`.

## Troubleshooting

### The vector is empty

The path may not exist.

### The wrong memory location was read

Use a JSON object and specify `memoryLocation`.

### My object became a list of pairs

That is expected for MEMO2. Use MEMO1 if you want the object preserved as a single vector item.
