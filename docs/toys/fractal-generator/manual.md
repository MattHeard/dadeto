# FRAC1 — Fractal Generator

## What this toy does

Fractal Generator creates a small recursive tree drawing as a canvas payload. It is useful for quickly experimenting with recursion, branch depth, canvas sizing, and color hue.

The toy accepts optional JSON. Empty input or malformed input falls back to defaults.

## Input format

Paste a JSON object with any of these optional fields:

- `width`: canvas width
- `height`: canvas height
- `depth`: recursive branch depth
- `hue`: base hue for branch colors

```json
{
  "width": 420,
  "height": 280,
  "depth": 6,
  "hue": 140
}
```

## Defaults and limits

The toy normalizes input before drawing.

| Field | Default | Limit |
|---|---:|---:|
| `width` | 360 | 160–800 |
| `height` | 240 | 120–600 |
| `depth` | 5 | 1–8 |
| `hue` | 180 | 0–360 |

`depth` is rounded to the nearest whole number before being clamped.

## How to use it

1. Leave the input empty and click **Submit** to see the default tree.
2. Add a JSON object with one or more fields.
3. Click **Submit** again.
4. Adjust values until the tree has the shape and color you want.

## Output

The toy returns a canvas drawing payload:

```json
{
  "width": 360,
  "height": 240,
  "shapes": []
}
```

The `shapes` array contains:

- one background rectangle
- recursive branch lines

The canvas presenter renders those shapes visually.

## How the drawing is built

The tree starts near the bottom center of the canvas. It draws an upward trunk, then recursively draws two child branches from the end of each branch.

Each child branch:

- is shorter than its parent
- turns left or right
- reduces the remaining depth by one

The toy stops drawing when depth reaches zero or a branch becomes too short.

## Useful experiments

### Change size only

```json
{
  "width": 640,
  "height": 400
}
```

This gives the same default tree logic more room.

### Make a compact tree

```json
{
  "width": 240,
  "height": 160,
  "depth": 4
}
```

This is useful when embedding the output in a small area.

### Try different color families

```json
{
  "hue": 30
}
```

Hue values are degrees on the color wheel:

- `0`: red
- `60`: yellow
- `120`: green
- `180`: cyan
- `240`: blue
- `300`: purple

## Tips

- Use `depth: 5` or `depth: 6` for a balanced drawing.
- Use `depth: 8` for the densest possible tree.
- Increase `height` if the tree feels cramped.
- Change only one parameter at a time when learning what each one does.

## Troubleshooting

### The tree did not use my value

The value may be outside the allowed range and was clamped. For example, `depth: 20` becomes `depth: 8`.

### The toy ignored my input

The input may be malformed JSON. Malformed JSON falls back to the default config.

### The output is JSON rather than an image

That is expected. The toy emits a canvas-presenter payload, and the presenter renders it visually.
