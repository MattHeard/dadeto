import { describe, expect, test, jest } from '@jest/globals';
import {
  gdpSectorProjection,
  gdpSectorProjectionTestOnly,
} from '../../../src/core/browser/toys/2026-06-14/gdpSectorProjection.js';

describe('gdpSectorProjection', () => {
  test('builds a multi-series graph payload with projected years', () => {
    const env = new Map([['getRandomNumber', jest.fn(() => 0.5)]]);
    const input = JSON.stringify({
      forecast: {
        inputEndYear: 2024,
        primaryDropYear: 2031,
        secondaryDropYear: 2037,
        tertiaryTarget: 100,
        outputEndYear: 2050,
      },
    });

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.type).toBe('graph-plot');
    expect(result.xMin).toBe(2000);
    expect(result.xMax).toBe(2050);
    expect(result.series).toHaveLength(3);
    expect(result.series[0].points.find(point => point.x === 2031).y).toBe(0);
    expect(result.series[1].points.find(point => point.x === 2037).y).toBe(0);
    expect(result.series[2].points.find(point => point.x === 2050).y).toBe(100);
    expect(
      result.series[0].points.find(point => point.x === 2000).y
    ).toBeCloseTo(2.175, 3);
  });

  test('falls back to the projection scaffold when given invalid input', () => {
    const env = new Map();
    const result = JSON.parse(gdpSectorProjection('not json', env));

    expect(result.type).toBe('graph-plot');
    expect(result.series).toHaveLength(3);
    expect(result.series[0].points[0].x).toBe(2000);
    expect(result.series[2].points.at(-1).x).toBe(2050);
  });

  test('uses the target values when the last known year is after the projection target', () => {
    const env = new Map();
    const input = JSON.stringify([
      { year: 2036, primary: 10, secondary: 20, tertiary: 70 },
    ]);

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.series[0].points.find(point => point.x === 2000).y).toBe(0);
    expect(result.series[0].points.find(point => point.x === 2030).y).toBe(0);
    expect(result.series[1].points.find(point => point.x === 2035).y).toBe(0);
    expect(result.series[2].points.find(point => point.x === 2050).y).toBe(100);
  });

  test('accepts object payloads and skips invalid rows', () => {
    const env = new Map();
    const input = JSON.stringify({
      rows: [
        { year: '2025', primary: '6', secondary: '18', tertiary: '76' },
        { year: 2024, primary: 7, secondary: 'oops', tertiary: 72 },
      ],
    });

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.series[0].points.find(point => point.x === 2025).y).toBe(6);
    expect(result.series[1].points.find(point => point.x === 2025).y).toBe(18);
    expect(result.series[2].points.find(point => point.x === 2025).y).toBe(76);
  });

  test('treats non-array rows payloads as empty input', () => {
    const env = new Map();
    const input = JSON.stringify({
      rows: { year: 2025, primary: 6, secondary: 18, tertiary: 76 },
    });

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.series[0].points[0].y).toBe(0);
    expect(result.series[2].points[0].y).toBe(100);
  });

  test('accepts empty object payloads as an empty row list', () => {
    const env = new Map();
    const result = JSON.parse(gdpSectorProjection(JSON.stringify({}), env));

    expect(result.series).toHaveLength(3);
    expect(result.series[0].points[0].x).toBe(2000);
    expect(result.series[2].points.at(-1).x).toBe(2050);
  });

  test('supports direct row arrays and configurable forecast years', () => {
    const env = new Map();
    const input = JSON.stringify([
      { year: 2000, primary: 10, secondary: 20, tertiary: 70 },
      { year: 2001, primary: 11, secondary: 19, tertiary: 70 },
    ]);

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.series[0].points[0].y).toBe(10);
    expect(result.series[1].points[1].y).toBe(19);
  });

  test('falls back to zeroed projection rows when given an empty array', () => {
    const env = new Map();
    const result = JSON.parse(gdpSectorProjection(JSON.stringify([]), env));

    expect(result.series[0].points[0].y).toBe(0);
    expect(result.series[1].points[0].y).toBe(0);
    expect(result.series[2].points[0].y).toBe(100);
  });

  test('ignores invalid forecast payloads', () => {
    const env = new Map();
    const input = JSON.stringify({ forecast: null });

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.xMax).toBe(2050);
    expect(
      result.series[0].points.find(point => point.x === 2000).y
    ).toBeCloseTo(2.175, 3);
  });

  test('ignores non-object forecast payloads', () => {
    const env = new Map();
    const input = JSON.stringify({ forecast: 'soon' });

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.xMax).toBe(2050);
    expect(
      result.series[0].points.find(point => point.x === 2024).y
    ).toBeCloseTo(1.614, 3);
  });

  test('falls back to default forecast values for non-numeric overrides', () => {
    const env = new Map();
    const input = JSON.stringify({
      forecast: {
        inputEndYear: 'soon',
        primaryDropYear: 'later',
        secondaryDropYear: 'much later',
        tertiaryTarget: 'all',
        outputEndYear: 'never',
      },
    });

    const result = JSON.parse(gdpSectorProjection(input, env));

    expect(result.xMax).toBe(2050);
    expect(result.yMax).toBe(100);
    expect(result.background).toBe('#faf8f4');
    expect(result.axesColor).toBe('#111827');
    expect(result.gridColor).toBe('#d1d5db');
    expect(result.lineColor).toBe('#6b7280');
  });

  test('looks up the random helper by its exact environment name', () => {
    const get = jest.fn(() => jest.fn(() => 0.5));
    gdpSectorProjection(JSON.stringify({}), { get });
    expect(get).toHaveBeenCalledWith('getRandomNumber');
  });

  test('normalizes and rejects share rows by each finite field', () => {
    expect(gdpSectorProjectionTestOnly.normalizeRows({})).toEqual([]);
    expect(gdpSectorProjectionTestOnly.normalizeRows([
      { year: '2020', primary: '1', secondary: '2', tertiary: '97' },
      { year: 2021, primary: 1, secondary: Infinity, tertiary: 98 },
    ])).toEqual([{ year: 2020, primary: 1, secondary: 2, tertiary: 97 }]);
    expect(gdpSectorProjectionTestOnly.isFiniteShareRow({
      year: 2020, primary: 1, secondary: 2, tertiary: 97,
    })).toBe(true);
    for (const field of ['year', 'primary', 'secondary', 'tertiary']) {
      expect(gdpSectorProjectionTestOnly.isFiniteShareRow({
        year: 2020, primary: 1, secondary: 2, tertiary: 97,
        [field]: Number.NaN,
      })).toBe(false);
    }
    expect(gdpSectorProjectionTestOnly.normalizeRows([
      { year: 2022, primary: 1, secondary: 2, tertiary: 97 },
      { year: 2020, primary: 1, secondary: 2, tertiary: 97 },
    ]).map(row => row.year)).toEqual([2020, 2022]);
  });

  test('covers interpolation, projection boundaries, and clamping', () => {
    const start = gdpSectorProjectionTestOnly.createProjectionRow(2020, 10, 20, 70);
    const end = gdpSectorProjectionTestOnly.createProjectionRow(2030, 0, 0, 100);
    expect(gdpSectorProjectionTestOnly.interpolateRow(start, end, 2025)).toEqual({
      year: 2025, primary: 5, secondary: 10, tertiary: 85,
    });
    expect(gdpSectorProjectionTestOnly.interpolateRow(end, start, 2035)).toEqual({
      year: 2035, primary: 10, secondary: 20, tertiary: 70,
    });
    expect(gdpSectorProjectionTestOnly.lerp(10, 20, 0.25)).toBe(12.5);
    expect(gdpSectorProjectionTestOnly.clampShare(-1)).toBe(0);
    expect(gdpSectorProjectionTestOnly.clampShare(50)).toBe(50);
    expect(gdpSectorProjectionTestOnly.clampShare(101)).toBe(100);
    const forecast = { inputEndYear: 2024, primaryDropYear: 2030, secondaryDropYear: 2035, tertiaryTarget: 100, outputEndYear: 2050 };
    const secondaryTarget = gdpSectorProjectionTestOnly.createProjectionRow(2035, 0, 0, 100);
    expect(gdpSectorProjectionTestOnly.createProjectedRow(2030, start, { primary: end, secondary: secondaryTarget }, forecast)).toEqual(end);
    expect(gdpSectorProjectionTestOnly.createProjectedRow(2025, start, { primary: end, secondary: secondaryTarget }, forecast).primary).toBe(5);
    expect(gdpSectorProjectionTestOnly.createProjectedRow(2035, start, { primary: end, secondary: secondaryTarget }, forecast).primary).toBe(0);
    expect(gdpSectorProjectionTestOnly.createProjectedRow(2040, start, { primary: end, secondary: secondaryTarget }, forecast).tertiary).toBe(100);
  });

  test('normalizes forecast and parser inputs safely', () => {
    expect(gdpSectorProjectionTestOnly.normalizeForecastInput(null)).toBeUndefined();
    expect(gdpSectorProjectionTestOnly.normalizeForecastInput('soon')).toBeUndefined();
    expect(gdpSectorProjectionTestOnly.normalizeForecastInput({ inputEndYear: 2020 })).toEqual({ inputEndYear: 2020 });
    expect(gdpSectorProjectionTestOnly.normalizeForecastConfig({ inputEndYear: '2020' })).toMatchObject({ inputEndYear: 2020, outputEndYear: 2050 });
    expect(gdpSectorProjectionTestOnly.numberOr('3', 0)).toBe(3);
    expect(gdpSectorProjectionTestOnly.numberOr('no', 7)).toBe(7);
    expect(gdpSectorProjectionTestOnly.safeParseJson('{')).toBeUndefined();
    expect(gdpSectorProjectionTestOnly.safeParseJson('{"ok":true}')).toEqual({ ok: true });
    expect(gdpSectorProjectionTestOnly.parseRequest(JSON.stringify({ rows: [], forecast: null }))).toEqual({ rows: [], forecast: undefined });
    expect(gdpSectorProjectionTestOnly.parseRequest(JSON.stringify({}))).toStrictEqual({});
    expect(gdpSectorProjectionTestOnly.parseRequest(JSON.stringify({ forecast: { inputEndYear: 2020 } }))).toEqual({ forecast: { inputEndYear: 2020 } });
    const anchorSeries = gdpSectorProjectionTestOnly.buildProjectionSeries([
      { year: 2020, primary: 10, secondary: 20, tertiary: 70 },
      { year: 2024, primary: 40, secondary: 30, tertiary: 30 },
      { year: 2025, primary: 80, secondary: 10, tertiary: 10 },
    ], { inputEndYear: 2024, primaryDropYear: 2030, secondaryDropYear: 2035, tertiaryTarget: 100, outputEndYear: 2035 });
    expect(anchorSeries.primary.find(point => point.x === 2024).y).toBe(40);
    expect(anchorSeries.primary.find(point => point.x === 2026).y).toBeCloseTo(26.6666667);
    const fallbackAnchor = gdpSectorProjectionTestOnly.buildProjectionSeries([
      { year: 2020, primary: 10, secondary: 20, tertiary: 70 },
    ], { inputEndYear: 2024, primaryDropYear: 2030, secondaryDropYear: 2035, tertiaryTarget: 100, outputEndYear: 2030 });
    expect(fallbackAnchor.primary.find(point => point.x === 2024).y).toBe(6);
    const sameYear = { year: 2020, primary: 10, secondary: 20, tertiary: 70 };
    expect(gdpSectorProjectionTestOnly.interpolateRow(sameYear, sameYear, 2020)).toEqual(sameYear);
    expect(gdpSectorProjectionTestOnly.buildProjectionSeries([
      { year: 2020, primary: 10, secondary: 20, tertiary: 70 },
    ], { inputEndYear: 2024, primaryDropYear: 2030, secondaryDropYear: 2035, tertiaryTarget: 100, outputEndYear: 2035 }).primary.at(-1).y).toBe(0);
    expect(() => gdpSectorProjection(JSON.stringify({}), {})).not.toThrow();
  });
});
