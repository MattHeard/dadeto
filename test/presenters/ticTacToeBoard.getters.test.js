import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let getPlayer;
let getPosition;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/presenters/ticTacToeBoard.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/from '([^']+)'/g, (_, rel) => {
    if (!rel.startsWith('.')) {return `from '${rel}'`;}
    const abs = pathToFileURL(path.join(path.dirname(filePath), rel));
    return `from '${abs.href}'`;
  });
  src += '\nexport { getPlayer, getPosition };';
  ({ getPlayer, getPosition } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('ticTacToeBoard getters', () => {
  test.each([undefined, null, 42, 'foo', []])(
    'return undefined for %p',
    value => {
      expect(getPlayer(value)).toBeUndefined();
      expect(getPosition(value)).toBeUndefined();
    }
  );
});
