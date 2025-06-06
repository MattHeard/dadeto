import fs from 'fs';
import path from 'path';
import { beforeAll, describe, test, expect } from '@jest/globals';

let isNegativeCoordinate;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/presenters/battleshipSolitaireFleet.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src += '\nexport { isNegativeCoordinate };';
  ({ isNegativeCoordinate } = await import(`data:text/javascript,${encodeURIComponent(src)}`));
});

describe('isNegativeCoordinate', () => {
  test.each([
    [{ x: -1, y: 0 }, true],
    [{ x: 0, y: -1 }, true],
    [{ x: 0, y: 0 }, false],
    [{ x: 2, y: 3 }, false],
  ])('given %p returns %p', (coord, expected) => {
    expect(isNegativeCoordinate(coord)).toBe(expected);
  });
});
