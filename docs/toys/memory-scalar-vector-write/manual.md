# MEMO3 — Memory Scalar/Vector Write

## What this toy does

Memory Scalar/Vector Write stores a JSON scalar or array value at a dot path inside one of Dadeto’s local memory locations.

It can write into:

- temporary memory
- permanent memory
- the full data envelope

Missing intermediate containers are created automatically. Numeric path segments create or index arrays.

## Input format

Paste a JSON object with:

- `memoryLocation`
- `path` or `key`
- `value`

```json
{
  "memoryLocation": "temporary",
  "path": "project.tasks.0.title",
  "value": "Design prototype"
}
```

## Supported memory locations

| `memoryLocation` | Meaning |
|---|---|
| `temporary` | Session/local temporary data envelope |
| `permanent` | Persistent local permanent data |
| `envelope` | Full data envelope |

If `memoryLocation` is missing or empty, it normalizes to `temporary`.

## Path format

Use dot notation:

```text
project.tasks.0.title
```

Path segments are split on `.`.

Numeric path segments are treated as array indexes when an array is needed:

```json
{
  "memoryLocation": "temporary",
  "path": "tasks.0",
  "value": "First task"
}
```

This can create an array under `tasks`.

## Supported values

`value` must be either:

- `null`
- string
- number
- boolean
- array

Objects are not accepted as values by this toy.

Valid examples:

```json
{
  "memoryLocation": "temporary",
  "path": "profile.name",
  "value": "Ada"
}
```

```json
{
  "memoryLocation": "temporary",
  "path": "scores",
  "value": [10, 20, 30]
}
```

```json
{
  "memoryLocation": "temporary",
  "path": "flags.enabled",
  "value": true
}
```

Invalid example:

```json
{
  "memoryLocation": "temporary",
  "path": "profile",
  "value": {
    "name": "Ada"
  }
}
```

The object value will be rejected.

## Output format

On success:

```json
{
  "memoryLocation": "temporary",
  "path": "project.tasks.0.title",
  "written": true,
  "value": "Design prototype"
}
```

On error:

```json
{
  "memoryLocation": "temporary",
  "path": "",
  "written": false,
  "error": "A non-empty path or key is required."
}
```

## How to use it

1. Choose a memory location.
2. Choose a dot path.
3. Choose a scalar or array value.
4. Submit the JSON.
5. Use MEMO1 or MEMO2 to inspect the value afterward.

## Common workflows

### Write a scalar, then inspect it

Submit to MEMO3:

```json
{
  "memoryLocation": "temporary",
  "path": "demo.message",
  "value": "Hello"
}
```

Then submit to MEMO2:

```json
{
  "memoryLocation": "temporary",
  "path": "demo"
}
```

### Write an array

```json
{
  "memoryLocation": "temporary",
  "path": "demo.items",
  "value": ["alpha", "beta", "gamma"]
}
```

### Write through numeric path segments

```json
{
  "memoryLocation": "temporary",
  "path": "demo.items.0",
  "value": "alpha"
}
```

## Tips

- Use `temporary` while experimenting.
- Use `permanent` only for values you want to persist locally.
- Use `envelope` carefully because it writes into the full data envelope.
- Namespace your paths, such as `myToy.settings.theme`.
- Use MEMO2 to inspect object-like containers as key-value pairs.

## Troubleshooting

### “Input must be a JSON object write request.”

The input was not valid JSON or was not a JSON object.

### “A non-empty path or key is required.”

Add a non-empty `path` or `key`.

### “A value property is required.”

The object must include a `value` field, even if the value is `null`.

### “Value must be a scalar or vector array.”

The value was probably an object. Use a scalar or array.

### “Cannot write non-numeric segment into an array.”

You tried to write an object-like key inside an array. Array paths must use numeric segments.
