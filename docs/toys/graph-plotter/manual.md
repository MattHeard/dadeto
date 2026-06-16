# GRAP1 — Graph Plotter

## What this toy does

Graph Plotter draws a single-variable mathematical expression on Cartesian axes. It turns a JSON graph configuration into a `graph-plot` payload for the canvas graph presenter.

Use it to sketch simple functions such as sine, cosine, quadratics, exponentials, and logarithms.

## Input format

Paste a JSON object.

```json
{
  "expression": "Math.sin(x)",
  "width": 420,
  "height": 280,
  "xMin": -6.283185307179586,
  "xMax": 6.283185307179586,
  "yMin": -1.5,
  "yMax": 1.5,
  "background": "#faf8f4",
  "axesColor": "#111827",
  "gridColor": "#d1d5db",
  "lineColor": "#2563eb"
}
```

All fields are optional. Invalid or missing fields fall back to defaults.

## Default graph

If you submit empty or invalid input, the toy uses a fallback sine graph:

```json
{
  "expression": "Math.sin(x)",
  "width": 420,
  "height": 280,
  "xMin": -6.283185307179586,
  "xMax": 6.283185307179586,
  "yMin": -1.5,
  "yMax": 1.5
}
```

## Supported fields

### `expression`

A JavaScript expression using `x`.

Examples:

```json
{ "expression": "x * x" }
```

```json
{ "expression": "Math.cos(x)" }
```

```json
{ "expression": "Math.exp(x)" }
```

The evaluator exposes `x` and `Math`.

### `width` and `height`

Canvas dimensions.

The toy uses `width` to determine how many points to sample. Wider graphs produce more sampled points.

### `xMin` and `xMax`

The horizontal plotting range.

### `yMin` and `yMax`

The vertical plotting range.

Values outside the visible range may be clipped by the graph presenter.

### Color fields

- `background`
- `axesColor`
- `gridColor`
- `lineColor`

Use CSS color strings.

## Sampling behavior

The toy does not accept a `samples` field.

Instead, it computes the number of points from the width:

```text
max(24, round(width / 4))
```

Each point is evaluated across the interval from `xMin` to `xMax`.

If an evaluated `y` value is not finite, that point is skipped.

## Output

The toy returns a graph payload:

```json
{
  "type": "graph-plot",
  "width": 420,
  "height": 280,
  "xMin": -6.283185307179586,
  "xMax": 6.283185307179586,
  "yMin": -1.5,
  "yMax": 1.5,
  "points": []
}
```

The presenter renders the graph visually.

## How to use it

1. Start with the default sine graph.
2. Change `expression`.
3. Adjust `xMin`, `xMax`, `yMin`, and `yMax` so the interesting part of the curve is visible.
4. Adjust `width` and `height` if you need a larger graph.
5. Submit again.

## Example expressions

### Quadratic

```json
{
  "expression": "x * x",
  "xMin": -5,
  "xMax": 5,
  "yMin": 0,
  "yMax": 25
}
```

### Cubic

```json
{
  "expression": "x * x * x",
  "xMin": -4,
  "xMax": 4,
  "yMin": -64,
  "yMax": 64
}
```

### Cosine

```json
{
  "expression": "Math.cos(x)",
  "xMin": -6.283185307179586,
  "xMax": 6.283185307179586,
  "yMin": -1.5,
  "yMax": 1.5
}
```

### Logarithm

```json
{
  "expression": "Math.log(x)",
  "xMin": 0.1,
  "xMax": 10,
  "yMin": -3,
  "yMax": 3
}
```

## Tips

- Use `Math.sin(x)`, not `sin(x)`.
- Use `Math.pow(x, 2)` or `x * x` for powers.
- Avoid expressions with side effects.
- Narrow the x-range when a curve changes too quickly.
- Set y-axis limits manually when the graph looks flat.

## Troubleshooting

### No curve appears

The expression may produce non-finite values, or the visible y-range may not include the curve.

### The expression is ignored

Check that the input is valid JSON. JSON strings require double quotes.

### The graph is too rough

Increase `width`. The toy samples more points on wider graphs.
