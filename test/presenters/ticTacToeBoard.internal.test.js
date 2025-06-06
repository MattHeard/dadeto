import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, it, expect } from '@jest/globals';

let getPlayer;
let getPosition;

beforeAll(async () => {
  const srcPath = path.join(process.cwd(), 'src/presenters/ticTacToeBoard.js');
  let src = fs.readFileSync(srcPath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { getPlayer, getPosition };';
  ({ getPlayer, getPosition } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('ticTacToeBoard internal functions', () => {
  it('getPlayer returns undefined for undefined move', () => {
    expect(getPlayer(undefined)).toBeUndefined();
  });

  it('getPosition returns undefined for undefined move', () => {
    expect(getPosition(undefined)).toBeUndefined();
  });

  it('handles null move without throwing', () => {
    expect(() => getPlayer(null)).not.toThrow();
    expect(() => getPosition(null)).not.toThrow();
    expect(getPlayer(null)).toBeUndefined();
    expect(getPosition(null)).toBeUndefined();
  });
});
