import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let getPlayer;
let getPosition;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/presenters/ticTacToeBoard.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/from '\.\.(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(filePath), '..' + p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { getPlayer, getPosition };';
  ({ getPlayer, getPosition } = await import(`data:text/javascript,${encodeURIComponent(src)}`));
});

describe('getPlayer/getPosition', () => {
  test('return undefined for undefined or null move without throwing', () => {
    expect(getPlayer(undefined)).toBeUndefined();
    expect(getPlayer(null)).toBeUndefined();
    expect(getPosition(undefined)).toBeUndefined();
    expect(getPosition(null)).toBeUndefined();
  });
});
