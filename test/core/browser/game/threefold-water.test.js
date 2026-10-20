import {
  flowWaterThroughPort,
  getWaterSurfaceElevationMeters,
} from '../../../../src/core/browser/game/threefold/water.js';
import { heightAtScale } from '../../../../src/core/browser/game/threefold/spatial.js';

const OPEN_PORT = {
  open: true,
  areaSquareMeters: 0.01,
  sillElevationMeters: 0,
};

describe('THREEFOLD physical water transfer', () => {
  test('reports a validated chamber water-surface elevation', () => {
    const chamber = createChamber('basin', 1, 2, 1);

    expect(getWaterSurfaceElevationMeters(chamber)).toBe(1.5);
    expect(() => getWaterSurfaceElevationMeters(null)).toThrow(TypeError);
  });

  test('moves water down a head gradient and conserves volume', () => {
    const chamberA = createChamber('upper', 1, 1, 1);
    const chamberB = createChamber('lower', 0, 2, 0.1);

    const result = flowWaterThroughPort(chamberA, chamberB, OPEN_PORT, 1);

    expect(result.sourceChamberId).toBe('upper');
    expect(result.transferredVolumeCubicMeters).toBeGreaterThan(0);
    expect(result.chambers[0].volumeCubicMeters).toBeLessThan(1);
    expect(result.chambers[1].volumeCubicMeters).toBeGreaterThan(0.1);
    expect(totalVolume(result.chambers)).toBeCloseTo(1.1, 12);
    expect(chamberA.volumeCubicMeters).toBe(1);
    expect(chamberB.volumeCubicMeters).toBe(0.1);
  });

  test('flows in either direction according to physical surface elevation', () => {
    const chamberA = createChamber('low-floor', 0, 1, 0.1);
    const chamberB = createChamber('high-floor', 1, 1, 0.5);

    const result = flowWaterThroughPort(chamberA, chamberB, OPEN_PORT, 1);

    expect(result.sourceChamberId).toBe('high-floor');
    expect(result.chambers[0].volumeCubicMeters).toBeGreaterThan(0.1);
    expect(result.chambers[1].volumeCubicMeters).toBeLessThan(0.5);
    expect(totalVolume(result.chambers)).toBeCloseTo(0.6, 12);
  });

  test('keeps flow unchanged when only the rendered scale changes', () => {
    const source = createChamber('source', 1, 1, 1);
    const sink = createChamber('sink', 0, 2, 0.1);
    const flows = [];
    const viewHeights = [];

    for (let scale = -4; scale <= 4; scale += 1) {
      viewHeights.push(heightAtScale(scale));
      flows.push(
        flowWaterThroughPort(source, sink, OPEN_PORT, 1)
          .transferredVolumeCubicMeters
      );
    }

    expect(new Set(viewHeights)).toHaveProperty('size', 9);
    expect(new Set(flows)).toHaveProperty('size', 1);
  });

  test('stops at hydrostatic equalization even for a long step', () => {
    const chamberA = createChamber('wide', 0, 2, 2);
    const chamberB = createChamber('narrow', 0, 1, 0);

    const result = flowWaterThroughPort(chamberA, chamberB, OPEN_PORT, 1000);

    expect(result.chambers[0].volumeCubicMeters).toBeCloseTo(4 / 3, 12);
    expect(result.chambers[1].volumeCubicMeters).toBeCloseTo(2 / 3, 12);
    expect(totalVolume(result.chambers)).toBeCloseTo(2, 12);
  });

  test.each([
    {
      label: 'closed port',
      chamberA: createChamber('a', 1, 1, 1),
      chamberB: createChamber('b', 0, 1, 0),
      port: { ...OPEN_PORT, open: false },
      durationSeconds: 1,
    },
    {
      label: 'zero duration',
      chamberA: createChamber('a', 1, 1, 1),
      chamberB: createChamber('b', 0, 1, 0),
      port: OPEN_PORT,
      durationSeconds: 0,
    },
    {
      label: 'equal surfaces',
      chamberA: createChamber('a', 0, 1, 1),
      chamberB: createChamber('b', 0.5, 2, 1),
      port: OPEN_PORT,
      durationSeconds: 1,
    },
    {
      label: 'water below the sill',
      chamberA: createChamber('a', 0, 1, 0.5),
      chamberB: createChamber('b', -1, 1, 0),
      port: { ...OPEN_PORT, sillElevationMeters: 1 },
      durationSeconds: 1,
    },
    {
      label: 'dry high chamber',
      chamberA: createChamber('a', 1, 1, 0),
      chamberB: createChamber('b', 0, 1, 0),
      port: OPEN_PORT,
      durationSeconds: 1,
    },
  ])(
    'does not transfer through a $label',
    ({ chamberA, chamberB, port, durationSeconds }) => {
      const result = flowWaterThroughPort(
        chamberA,
        chamberB,
        port,
        durationSeconds
      );

      expect(result.chambers).toEqual([chamberA, chamberB]);
      expect(result.transferredVolumeCubicMeters).toBe(0);
      expect(result.sourceChamberId).toBeNull();
    }
  );

  test('limits flow to water above the port sill', () => {
    const chamberA = createChamber('source', 0, 1, 0.5);
    const chamberB = createChamber('sink', -1, 1, 0);
    const port = { ...OPEN_PORT, sillElevationMeters: 0.25 };

    const result = flowWaterThroughPort(chamberA, chamberB, port, 1000);

    expect(result.chambers[0].volumeCubicMeters).toBeCloseTo(0.25, 12);
    expect(result.chambers[1].volumeCubicMeters).toBeCloseTo(0.25, 12);
    expect(totalVolume(result.chambers)).toBeCloseTo(0.5, 12);
  });

  test('rejects invalid chambers, ports, and elapsed time', () => {
    const chamber = createChamber('a', 0, 1, 1);
    const other = createChamber('b', 0, 1, 0);

    expect(() => flowWaterThroughPort(null, other, OPEN_PORT, 1)).toThrow(
      TypeError
    );
    expect(() =>
      flowWaterThroughPort({ ...chamber, id: '' }, other, OPEN_PORT, 1)
    ).toThrow(TypeError);
    expect(() =>
      flowWaterThroughPort({ ...chamber, id: 3 }, other, OPEN_PORT, 1)
    ).toThrow(TypeError);
    expect(() =>
      flowWaterThroughPort(
        { ...chamber, floorElevationMeters: NaN },
        other,
        OPEN_PORT,
        1
      )
    ).toThrow(RangeError);
    expect(() =>
      flowWaterThroughPort(
        { ...chamber, floorElevationMeters: '0' },
        other,
        OPEN_PORT,
        1
      )
    ).toThrow(RangeError);
    expect(() =>
      flowWaterThroughPort(
        { ...chamber, areaSquareMeters: 0 },
        other,
        OPEN_PORT,
        1
      )
    ).toThrow(RangeError);
    expect(() =>
      flowWaterThroughPort(
        { ...chamber, volumeCubicMeters: -1 },
        other,
        OPEN_PORT,
        1
      )
    ).toThrow(RangeError);
    expect(() => flowWaterThroughPort(chamber, chamber, OPEN_PORT, 1)).toThrow(
      RangeError
    );
    expect(() => flowWaterThroughPort(chamber, other, null, 1)).toThrow(
      TypeError
    );
    expect(() =>
      flowWaterThroughPort(chamber, other, { ...OPEN_PORT, open: 1 }, 1)
    ).toThrow(TypeError);
    expect(() =>
      flowWaterThroughPort(
        chamber,
        other,
        { ...OPEN_PORT, areaSquareMeters: 0 },
        1
      )
    ).toThrow(RangeError);
    expect(() =>
      flowWaterThroughPort(
        chamber,
        other,
        { ...OPEN_PORT, sillElevationMeters: Infinity },
        1
      )
    ).toThrow(RangeError);
    expect(() => flowWaterThroughPort(chamber, other, OPEN_PORT, -1)).toThrow(
      RangeError
    );
    expect(() => flowWaterThroughPort(chamber, other, OPEN_PORT, '1')).toThrow(
      RangeError
    );
    expect(() =>
      flowWaterThroughPort(chamber, other, OPEN_PORT, Infinity)
    ).toThrow(RangeError);
  });
});

/**
 * Create one test chamber.
 * @param {string} id Unique chamber identifier.
 * @param {number} floorElevationMeters Chamber floor elevation.
 * @param {number} areaSquareMeters Constant chamber cross-section.
 * @param {number} volumeCubicMeters Initial water volume.
 * @returns {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} Test chamber.
 */
function createChamber(
  id,
  floorElevationMeters,
  areaSquareMeters,
  volumeCubicMeters
) {
  return { id, floorElevationMeters, areaSquareMeters, volumeCubicMeters };
}

/**
 * Sum chamber water volumes.
 * @param {Array<{volumeCubicMeters: number}>} chambers Chambers to sum.
 * @returns {number} Total water volume.
 */
function totalVolume(chambers) {
  return chambers.reduce(
    (total, chamber) => total + chamber.volumeCubicMeters,
    0
  );
}
