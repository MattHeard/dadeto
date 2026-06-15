import { publicHistoricalRows } from './gdpSectorProjection.publicRows.js';

const INPUT_START_YEAR = 2000;
const DEFAULT_INPUT_END_YEAR = 2024;
const DEFAULT_PRIMARY_DROP_YEAR = 2030;
const DEFAULT_SECONDARY_DROP_YEAR = 2035;
const DEFAULT_TERTIARY_TARGET = 100;
const DEFAULT_OUTPUT_END_YEAR = 2050;

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
  const request = parseRequest(input);
  let rows = publicHistoricalRows;
  if (request.rows !== undefined) {
    rows = request.rows;
  }
  const forecast = normalizeForecastConfig(request.forecast);
  const points = buildProjectionSeries(rows, forecast);
  const payload = {
    type: 'graph-plot',
    width: 760,
    height: 420,
    background: '#faf8f4',
    axesColor: '#111827',
    gridColor: '#d1d5db',
    lineColor: '#6b7280',
    xMin: INPUT_START_YEAR,
    xMax: forecast.outputEndYear,
    yMin: 0,
    yMax: forecast.tertiaryTarget,
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
 * Parse the toy request payload.
 * @param {string} input JSON input.
 * @returns {{ rows?: { year: number, primary: number, secondary: number, tertiary: number }[], forecast?: unknown }} Parsed request.
 */
function parseRequest(input) {
  const parsed = safeParseJson(input);
  if (!parsed) {
    return {};
  }
  const typedParsed =
    /** @type {{ rows?: unknown[]; forecast?: unknown } | unknown[] } */ (
      parsed
    );
  if (Array.isArray(typedParsed)) {
    return {
      rows: normalizeRows(typedParsed),
    };
  }
  const parsedObject = /** @type {{ rows?: unknown[]; forecast?: unknown }} */ (
    typedParsed
  );
  /** @type {{ rows?: { year: number, primary: number, secondary: number, tertiary: number }[], forecast?: unknown }} */
  const request = {};
  if ('rows' in parsedObject) {
    request.rows = normalizeRows(parsedObject.rows);
  }
  if ('forecast' in parsedObject) {
    request.forecast = normalizeForecastInput(parsedObject.forecast);
  }
  return request;
}

/**
 * Normalize a raw row list into typed GDP rows.
 * @param {unknown} rows Row-like entries.
 * @returns {{ year: number, primary: number, secondary: number, tertiary: number }[]} Row-like entries.
 */
function normalizeRows(rows) {
  /** @type {{ year?: unknown, primary?: unknown, secondary?: unknown, tertiary?: unknown }[]} */
  let typedRows = [];
  if (Array.isArray(rows)) {
    typedRows =
      /** @type {{ year?: unknown, primary?: unknown, secondary?: unknown, tertiary?: unknown }[]} */ (
        rows
      );
  }
  const normalizedRows = typedRows
    .map(normalizeRow)
    .filter(row => row !== null);
  normalizedRows.sort((left, right) => left.year - right.year);
  return normalizedRows;
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
 * @param {{ inputEndYear:number, primaryDropYear:number, secondaryDropYear:number, tertiaryTarget:number, outputEndYear:number }} forecast Forecast config.
 * @returns {{ primary: { x: number, y: number }[], secondary: { x: number, y: number }[], tertiary: { x: number, y: number }[] }} Series points.
 */
function buildProjectionSeries(rows, forecast) {
  const knownByYear = new Map(rows.map(row => [row.year, row]));
  const anchor =
    rows.find(row => row.year === forecast.inputEndYear) ||
    rows[rows.length - 1];
  const lastKnown =
    anchor ||
    createProjectionRow(forecast.inputEndYear, 0, 0, forecast.tertiaryTarget);

  const projectionTargets = {
    primary: createProjectionRow(
      forecast.primaryDropYear,
      0,
      lastKnown.secondary,
      lastKnown.tertiary
    ),
    secondary: createProjectionRow(
      forecast.secondaryDropYear,
      0,
      0,
      forecast.tertiaryTarget
    ),
  };

  /** @type {{ x: number, y: number }[]} */
  const primary = [];
  /** @type {{ x: number, y: number }[]} */
  const secondary = [];
  /** @type {{ x: number, y: number }[]} */
  const tertiary = [];

  for (let year = INPUT_START_YEAR; year <= forecast.outputEndYear; year += 1) {
    const source = knownByYear.get(year);
    const data =
      source ||
      createProjectedRow(year, lastKnown, projectionTargets, forecast);
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
 * @param {{ primary: { year: number, primary: number, secondary: number, tertiary: number }, secondary: { year: number, primary: number, secondary: number, tertiary: number } }} projectionTargets Projection target rows.
 * @param {{ inputEndYear:number, primaryDropYear:number, secondaryDropYear:number, tertiaryTarget:number, outputEndYear:number }} forecast Forecast config.
 * @returns {{ year: number, primary: number, secondary: number, tertiary: number }} Projected row.
 */
function createProjectedRow(year, lastKnown, projectionTargets, forecast) {
  if (year <= forecast.primaryDropYear) {
    return interpolateRow(lastKnown, projectionTargets.primary, year);
  }
  if (year <= forecast.secondaryDropYear) {
    return interpolateRow(
      projectionTargets.primary,
      projectionTargets.secondary,
      year
    );
  }
  return createProjectionRow(year, 0, 0, forecast.tertiaryTarget);
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

/**
 * Normalize a forecast config block.
 * @param {unknown} forecast Forecast config input.
 * @returns {{ inputEndYear:number, primaryDropYear:number, secondaryDropYear:number, tertiaryTarget:number, outputEndYear:number }} Forecast config.
 */
function normalizeForecastConfig(forecast) {
  const typedForecast = normalizeForecastInput(forecast) || {};
  return {
    inputEndYear: numberOr(typedForecast.inputEndYear, DEFAULT_INPUT_END_YEAR),
    primaryDropYear: numberOr(
      typedForecast.primaryDropYear,
      DEFAULT_PRIMARY_DROP_YEAR
    ),
    secondaryDropYear: numberOr(
      typedForecast.secondaryDropYear,
      DEFAULT_SECONDARY_DROP_YEAR
    ),
    tertiaryTarget: numberOr(
      typedForecast.tertiaryTarget,
      DEFAULT_TERTIARY_TARGET
    ),
    outputEndYear: numberOr(
      typedForecast.outputEndYear,
      DEFAULT_OUTPUT_END_YEAR
    ),
  };
}

/**
 * Normalize forecast input to a safe object.
 * @param {unknown} forecast Raw forecast input.
 * @returns {{ inputEndYear?: unknown, primaryDropYear?: unknown, secondaryDropYear?: unknown, tertiaryTarget?: unknown, outputEndYear?: unknown } | undefined} Forecast input.
 */
function normalizeForecastInput(forecast) {
  if (!forecast || typeof forecast !== 'object') {
    return undefined;
  }
  return /** @type {{ inputEndYear?: unknown, primaryDropYear?: unknown, secondaryDropYear?: unknown, tertiaryTarget?: unknown, outputEndYear?: unknown }} */ (
    forecast
  );
}

/**
 * Coerce a number-like value.
 * @param {unknown} value Value to coerce.
 * @param {number} fallback Fallback number.
 * @returns {number} Number or fallback.
 */
function numberOr(value, fallback) {
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number;
  }
  return fallback;
}
