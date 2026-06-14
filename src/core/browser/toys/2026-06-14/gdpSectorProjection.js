const INPUT_START_YEAR = 2000;
const INPUT_END_YEAR = 2025;
const PRIMARY_DROP_YEAR = 2030;
const SECONDARY_DROP_YEAR = 2035;
const OUTPUT_END_YEAR = 2050;

const PRIMARY_COLOR = '#b45309';
const SECONDARY_COLOR = '#0f766e';
const TERTIARY_COLOR = '#4338ca';

/**
 * Convert GDP sector share data into a graph payload.
 * @param {string} input JSON array or object containing yearly GDP sector shares.
 * @param {{ get?: (name: string) => (() => number) | undefined }} env Toy environment helpers.
 * @returns {string} JSON graph payload for the graph presenter.
 */
export function gdpSectorProjection(input, env) {
  const getRandomNumber = env.get?.('getRandomNumber') || (() => 0.5);
  const rows = parseRows(input);
  const points = buildProjectionSeries(rows);
  const payload = {
    type: 'graph-plot',
    width: 760,
    height: 420,
    background: '#faf8f4',
    axesColor: '#111827',
    gridColor: '#d1d5db',
    lineColor: '#6b7280',
    xMin: INPUT_START_YEAR,
    xMax: OUTPUT_END_YEAR,
    yMin: 0,
    yMax: 100,
    points: points.primary,
    series: [
      { lineColor: PRIMARY_COLOR, points: points.primary },
      { lineColor: SECONDARY_COLOR, points: points.secondary },
      { lineColor: TERTIARY_COLOR, points: points.tertiary },
    ],
  };
  getRandomNumber();
  return JSON.stringify(payload);
}

/**
 * Parse rows from the input payload.
 * @param {string} input JSON input.
 * @returns {{ year: number, primary: number, secondary: number, tertiary: number }[]} Parsed rows.
 */
function parseRows(input) {
  const parsed = safeParseJson(input);
  if (!parsed) {
    return [];
  }
  const typedRows = extractTypedRows(parsed);
  const normalizedRows = typedRows
    .map(normalizeRow)
    .filter(row => row !== null);
  normalizedRows.sort((left, right) => left.year - right.year);
  return /** @type {{ year: number, primary: number, secondary: number, tertiary: number }[]} */ (
    normalizedRows
  );
}

/**
 * Extract typed rows from the parsed JSON payload.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {{ year?: unknown, primary?: unknown, secondary?: unknown, tertiary?: unknown }[]} Row-like entries.
 */
function extractTypedRows(parsed) {
  const typedParsed = /** @type {{ rows?: unknown[] } | unknown[]} */ (parsed);
  if (Array.isArray(typedParsed)) {
    return /** @type {{ year?: unknown, primary?: unknown, secondary?: unknown, tertiary?: unknown }[]} */ (
      typedParsed
    );
  }
  return /** @type {{ year?: unknown, primary?: unknown, secondary?: unknown, tertiary?: unknown }[]} */ (
    typedParsed.rows || []
  );
}

/**
 * Normalize a row-like value into a typed GDP row.
 * @param {{ year?: unknown, primary?: unknown, secondary?: unknown, tertiary?: unknown }} row Row-like entry.
 * @returns {{ year: number, primary: number, secondary: number, tertiary: number } | null} Normalized row.
 */
function normalizeRow(row) {
  const normalizedRow = {
    year: Number(row.year),
    primary: Number(row.primary),
    secondary: Number(row.secondary),
    tertiary: Number(row.tertiary),
  };
  if (!isFiniteShareRow(normalizedRow)) {
    return null;
  }
  return normalizedRow;
}

/**
 * Check whether a row contains finite shares.
 * @param {{ year: number, primary: number, secondary: number, tertiary: number }} row Normalized row.
 * @returns {boolean} Whether the row is valid.
 */
function isFiniteShareRow(row) {
  return (
    Number.isFinite(row.year) &&
    Number.isFinite(row.primary) &&
    Number.isFinite(row.secondary) &&
    Number.isFinite(row.tertiary)
  );
}

/**
 * Build yearly projection points from the source rows.
 * @param {{ year: number, primary: number, secondary: number, tertiary: number }[]} rows Source rows.
 * @returns {{ primary: { x: number, y: number }[], secondary: { x: number, y: number }[], tertiary: { x: number, y: number }[] }} Series points.
 */
function buildProjectionSeries(rows) {
  const knownByYear = new Map(rows.map(row => [row.year, row]));
  const anchor =
    rows.find(row => row.year === INPUT_END_YEAR) || rows[rows.length - 1];
  const lastKnown = anchor || createProjectionRow(INPUT_END_YEAR, 0, 0, 100);

  const primaryTarget = createProjectionRow(
    PRIMARY_DROP_YEAR,
    0,
    lastKnown.secondary,
    lastKnown.tertiary
  );
  const secondaryTarget = createProjectionRow(SECONDARY_DROP_YEAR, 0, 0, 100);

  /** @type {{ x: number, y: number }[]} */
  const primary = [];
  /** @type {{ x: number, y: number }[]} */
  const secondary = [];
  /** @type {{ x: number, y: number }[]} */
  const tertiary = [];

  for (let year = INPUT_START_YEAR; year <= OUTPUT_END_YEAR; year += 1) {
    const source = knownByYear.get(year);
    const data =
      source ||
      createProjectedRow(year, lastKnown, primaryTarget, secondaryTarget);
    appendSeriesPoints({ primary, secondary, tertiary }, year, data);
  }

  return { primary, secondary, tertiary };
}

/**
 * Append one year of data to all three series.
 * @param {{ primary: { x: number, y: number }[], secondary: { x: number, y: number }[], tertiary: { x: number, y: number }[] }} series Series points.
 * @param {number} year Year coordinate.
 * @param {{ primary: number, secondary: number, tertiary: number }} data Year values.
 */
function appendSeriesPoints(series, year, data) {
  series.primary.push({ x: year, y: clampShare(data.primary) });
  series.secondary.push({ x: year, y: clampShare(data.secondary) });
  series.tertiary.push({ x: year, y: clampShare(data.tertiary) });
}

/**
 * Build a projected row for a missing year.
 * @param {number} year Year to project.
 * @param {{ year: number, primary: number, secondary: number, tertiary: number }} lastKnown Last known row.
 * @param {{ year: number, primary: number, secondary: number, tertiary: number }} primaryTarget Primary drop target.
 * @param {{ year: number, primary: number, secondary: number, tertiary: number }} secondaryTarget Secondary drop target.
 * @returns {{ year: number, primary: number, secondary: number, tertiary: number }} Projected row.
 */
function createProjectedRow(year, lastKnown, primaryTarget, secondaryTarget) {
  if (year <= PRIMARY_DROP_YEAR) {
    return interpolateRow(lastKnown, primaryTarget, year);
  } else if (year <= SECONDARY_DROP_YEAR) {
    return interpolateRow(primaryTarget, secondaryTarget, year);
  }
  return createProjectionRow(year, 0, 0, 100);
}

/**
 * Create a normalized GDP projection row.
 * @param {number} year Year value.
 * @param {number} primary Primary share.
 * @param {number} secondary Secondary share.
 * @param {number} tertiary Tertiary share.
 * @returns {{ year: number, primary: number, secondary: number, tertiary: number }} Projection row.
 */
function createProjectionRow(year, primary, secondary, tertiary) {
  return { year, primary, secondary, tertiary };
}

/**
 * Parse JSON while swallowing syntax errors.
 * @param {string} input Raw JSON text.
 * @returns {unknown | undefined} Parsed payload or `undefined`.
 */
function safeParseJson(input) {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

/**
 * Interpolate between two rows.
 * @param {{ year: number, primary: number, secondary: number, tertiary: number }} start Start row.
 * @param {{ year: number, primary: number, secondary: number, tertiary: number }} end End row.
 * @param {number} year Year to interpolate.
 * @returns {{ year: number, primary: number, secondary: number, tertiary: number }} Interpolated row.
 */
function interpolateRow(start, end, year) {
  const span = end.year - start.year;
  if (span <= 0) {
    return {
      year,
      primary: end.primary,
      secondary: end.secondary,
      tertiary: end.tertiary,
    };
  }
  const ratio = (year - start.year) / span;
  return {
    year,
    primary: lerp(start.primary, end.primary, ratio),
    secondary: lerp(start.secondary, end.secondary, ratio),
    tertiary: lerp(start.tertiary, end.tertiary, ratio),
  };
}

/**
 * Linear interpolation.
 * @param {number} start Start value.
 * @param {number} end End value.
 * @param {number} ratio Blend ratio.
 * @returns {number} Interpolated value.
 */
function lerp(start, end, ratio) {
  return start + (end - start) * ratio;
}

/**
 * Clamp a share to a visible percentage.
 * @param {number} value Share value.
 * @returns {number} Clamped share.
 */
function clampShare(value) {
  return Math.min(100, Math.max(0, value));
}
