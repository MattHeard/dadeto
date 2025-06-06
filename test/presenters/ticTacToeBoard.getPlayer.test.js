import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let getPlayer;
let getPosition;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/presenters/ticTacToeBoard.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(filePath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { getPlayer, getPosition };';
  ({ getPlayer, getPosition } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('getPlayer and getPosition', () => {
  test('return undefined for null move', () => {
    expect(getPlayer(null)).toBeUndefined();
    expect(getPosition(null)).toBeUndefined();
  });

  test('return undefined for undefined move', () => {
    expect(getPlayer(undefined)).toBeUndefined();
    expect(getPosition(undefined)).toBeUndefined();
  });

  test('return undefined when property missing', () => {
    expect(getPlayer({})).toBeUndefined();
    expect(getPosition({})).toBeUndefined();
  });
});
