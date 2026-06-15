import { describe, expect, test, jest } from '@jest/globals';
import { gdpSectorProjection } from '../../../src/core/browser/toys/2026-06-14/gdpSectorProjection.js';

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
  });
});
