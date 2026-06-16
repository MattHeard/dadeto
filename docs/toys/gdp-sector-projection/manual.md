# GDPS1 — GDP Sector Projection

## What this toy does

GDP Sector Projection plots primary, secondary, and tertiary GDP sector shares over time. It combines historical rows with a simple forward projection.

If you submit no valid rows, the toy uses its built-in public historical snapshot. This makes the graph render even with empty input.

## Input formats

You can provide either:

1. a raw array of yearly rows
2. an object with `rows` and optional `forecast`

## Option 1: raw row array

```json
[
  {
    "year": 2000,
    "primary": 25,
    "secondary": 30,
    "tertiary": 45
  },
  {
    "year": 2010,
    "primary": 15,
    "secondary": 35,
    "tertiary": 50
  }
]
```

## Option 2: object with rows and forecast

```json
{
  "rows": [
    {
      "year": 2000,
      "primary": 25,
      "secondary": 30,
      "tertiary": 45
    },
    {
      "year": 2024,
      "primary": 6,
      "secondary": 24,
      "tertiary": 70
    }
  ],
  "forecast": {
    "inputEndYear": 2024,
    "primaryDropYear": 2030,
    "secondaryDropYear": 2035,
    "tertiaryTarget": 100,
    "outputEndYear": 2050
  }
}
```

## Row fields

Each row should contain:

- `year`
- `primary`
- `secondary`
- `tertiary`

The values are converted to numbers. Rows with non-finite values are ignored. Rows are sorted by year.

The toy does not require the three sector shares to sum to `100`, but your graph will usually be easier to interpret if they do.

## Forecast fields

### `inputEndYear`

The year used as the projection anchor. Default: `2024`.

If there is a row for this year, the toy uses it. Otherwise it uses the last available row.

### `primaryDropYear`

The year when the primary sector reaches `0`. Default: `2030`.

### `secondaryDropYear`

The year when the secondary sector reaches `0`. Default: `2035`.

### `tertiaryTarget`

The final tertiary-sector target and graph y-axis maximum. Default: `100`.

### `outputEndYear`

The final year to plot. Default: `2050`.

## Projection behavior

The toy builds yearly points from `2000` through `outputEndYear`.

For each year:

- If a historical row exists, that row is used.
- Otherwise, a projected row is generated.
- Primary declines to `0` by `primaryDropYear`.
- Secondary declines to `0` by `secondaryDropYear`.
- Tertiary rises toward `tertiaryTarget`.
- After `secondaryDropYear`, the projection is `0` primary, `0` secondary, and `tertiaryTarget` tertiary.

Output values are clamped to the visible `0–100` range.

## Output

The toy returns a `graph-plot` payload for the graph presenter. It includes:

- canvas dimensions
- axis bounds
- graph colors
- primary sector series
- secondary sector series
- tertiary sector series

The graph presenter renders the three series as lines.

## How to use it

1. Submit empty input to see the default historical snapshot and projection.
2. Add a few rows if you want to model a different economy.
3. Adjust `forecast` values to test different transition assumptions.
4. Click **Submit** and inspect the plotted sector trajectories.

## Useful experiments

### Extend the projection

```json
{
  "forecast": {
    "outputEndYear": 2075
  }
}
```

### Slow down industrial decline

```json
{
  "forecast": {
    "secondaryDropYear": 2050
  }
}
```

### Use a lower tertiary target

```json
{
  "forecast": {
    "tertiaryTarget": 85
  }
}
```

## Tips

- Include a row for `inputEndYear` if you want precise control over the projection anchor.
- Use plausible sector-share values if you want the graph to be meaningful.
- Keep `outputEndYear` after `inputEndYear`.
- Compare multiple scenarios by changing one forecast field at a time.

## Limitations

- This is a simple structural projection, not an econometric model.
- It does not fetch live data.
- It does not validate that sector shares sum to `100`.
- It does not model uncertainty.
