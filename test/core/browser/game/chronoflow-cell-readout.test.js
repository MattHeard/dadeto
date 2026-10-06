import { describe, expect, it } from '@jest/globals';
import { createFluidState } from '../../../../src/core/browser/game/chronoflow/chronoflow.js';
import { getCellReadout } from '../../../../src/core/browser/game/chronoflow/cellReadout.js';

describe('Chronoflow selected-cell readout', () => {
  it('reports depth, solver-consistent hydraulic head, velocity, and terrain', () => {
    const fluid = createFluidState({
      width: 2,
      height: 2,
      volume: [1, 0.4, 0, 0.7],
      velocityX: [0, 0.3, 0, -0.2],
      velocityY: [0, 0, 0, 0.5],
      solids: [false, false, true, false],
    });

    expect(getCellReadout(fluid, 0)).toEqual({
      cell: 1,
      row: 0,
      depth: 1,
      hydraulicHead: 1,
      velocityX: 0,
      velocityY: 0,
      solid: false,
    });
    expect(getCellReadout(fluid, 2)).toMatchObject({
      cell: 3,
      row: 1,
      depth: 0,
      hydraulicHead: 1,
      solid: true,
    });
    expect(getCellReadout(fluid, 3)).toMatchObject({
      cell: 4,
      row: 1,
      depth: 0.7,
      hydraulicHead: 1.7,
      velocityX: -0.2,
      velocityY: 0.5,
      solid: false,
    });
    expect(() => getCellReadout(fluid, -1)).toThrow(RangeError);
    expect(() => getCellReadout(fluid, 4)).toThrow(RangeError);
    expect(() => getCellReadout(fluid, 1.2)).toThrow(RangeError);
  });
});
