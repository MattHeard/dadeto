import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/core/browser/plotShared.js', () => ({
  parseObjectPayload: (input, map) => {
    try {
      const parsed = JSON.parse(input);
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        return null;
      }
      return map(parsed);
    } catch {
      return null;
    }
  },
  numberOr: (value, fallback) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback,
  stringOr: (value, fallback) =>
    typeof value === 'string' && value.length > 0 ? value : fallback,
}));

const {
  buildGraphPlotFromJson,
  buildGraphPlotPayload,
  createGraphPlotFallbackPayload,
  normalizeGraphPlotPayload,
  parseGraphPlot,
} = await import('../../../src/core/browser/graphPlotCore.js');

const completePayload = overrides => ({
  expression: 'x',
  width: 24,
  height: 24,
  xMin: -1,
  xMax: 1,
  yMin: -1,
  yMax: 1,
  background: '#fff',
  axesColor: '#000',
  gridColor: '#ccc',
  lineColor: '#f00',
  ...overrides,
});

describe('graphPlotCore mutation contract', () => {
  it('parses objects and rejects invalid JSON', () => {
    expect(parseGraphPlot('{"expression":"x"}')).toEqual({ expression: 'x' });
    expect(parseGraphPlot('{')).toBeNull();
  });

  it('creates the exact fallback payload', () => {
    expect(createGraphPlotFallbackPayload()).toMatchObject({
      expression: 'Math.sin(x)',
      width: 420,
      height: 280,
      xMin: -Math.PI * 2,
      xMax: Math.PI * 2,
      yMin: -1.5,
      yMax: 1.5,
      series: [],
    });
  });

  it('normalizes fields and series independently', () => {
    const normalized = normalizeGraphPlotPayload(
      completePayload({
        expression: '',
        width: Number.NaN,
        series: { invalid: true },
      })
    );

    expect(normalized.expression).toBe('Math.sin(x)');
    expect(normalized.width).toBe(420);
    expect(normalized.series).toEqual([]);

    const series = [{ points: [{ x: 1, y: 2 }] }];
    expect(normalizeGraphPlotPayload(completePayload({ series })).series).toBe(
      series
    );
  });

  it('builds finite points and omits empty series', () => {
    const payload = buildGraphPlotPayload(
      completePayload({ expression: 'x * x' })
    );

    expect(payload.type).toBe('graph-plot');
    expect(payload.points).toHaveLength(25);
    expect(payload.points[0]).toEqual({ x: -1, y: 1 });
    expect(payload.points[12]).toEqual({ x: 0, y: 0 });
    expect(payload.points.at(-1)).toEqual({ x: 1, y: 1 });
    expect(payload.series).toBeUndefined();
    expect(
      buildGraphPlotPayload(completePayload({ series: [] })).series
    ).toBeUndefined();
  });

  it('keeps non-empty series and suppresses invalid expression points', () => {
    const series = [{ lineColor: '#0f0', points: [{ x: 1, y: 2 }] }];
    expect(buildGraphPlotPayload(completePayload({ series })).series).toEqual(
      series
    );
    expect(
      buildGraphPlotPayload(completePayload({ expression: '(' })).points
    ).toEqual([]);
  });

  it('filters non-finite evaluated points', () => {
    const payload = buildGraphPlotPayload(
      completePayload({ expression: 'x < 0 ? Number.NaN : x' })
    );

    expect(payload.points).toEqual(expect.arrayContaining([{ x: 0, y: 0 }]));
    expect(payload.points.every(point => Number.isFinite(point.y))).toBe(true);
  });

  it('uses fallback JSON input and calls the random source once', () => {
    const getRandomNumber = jest.fn(() => 0.5);
    const payload = buildGraphPlotFromJson('{', getRandomNumber);

    expect(getRandomNumber).toHaveBeenCalledTimes(1);
    expect(payload.type).toBe('graph-plot');
    expect(payload.points.length).toBeGreaterThan(0);
  });

  it('uses a valid JSON payload instead of the fallback', () => {
    const getRandomNumber = jest.fn(() => 0.5);
    const payload = buildGraphPlotFromJson(
      '{"expression":"x","width":24,"height":24,"xMin":0,"xMax":1,"yMin":0,"yMax":1,"background":"#a","axesColor":"#b","gridColor":"#c","lineColor":"#d"}',
      getRandomNumber
    );

    expect(payload.xMin).toBe(0);
    expect(payload.xMax).toBe(1);
    expect(payload.points[0]).toEqual({ x: 0, y: 0 });
    expect(payload.points.at(-1)).toEqual({ x: 1, y: 1 });
  });

  it('passes Math through the expression evaluator', () => {
    const payload = buildGraphPlotPayload(
      completePayload({
        expression: 'Math.sin(x)',
        xMin: 0,
        xMax: Math.PI / 2,
      })
    );

    expect(payload.points.at(-1).y).toBeCloseTo(1);
  });
});
