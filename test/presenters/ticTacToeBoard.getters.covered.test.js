import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let getPlayer;
let getPosition;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/presenters/ticTacToeBoard.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/)[^']*)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(filePath), p));
    return `from '${abs.href}'`;
  });
  src += `\nexport { getPlayer, getPosition };\n//# sourceURL=${pathToFileURL(filePath).href}`;
  ({ getPlayer, getPosition } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('ticTacToeBoard getters via import', () => {
  test('getPlayer returns undefined for undefined move', () => {
    expect(getPlayer(undefined)).toBeUndefined();
  });

  test('getPosition returns undefined for undefined move', () => {
    expect(getPosition(undefined)).toBeUndefined();
  });
});
