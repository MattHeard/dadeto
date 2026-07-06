import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('browser main import', () => {
  it('stays thin and delegates to the shared browser main', async () => {
    const source = await readFile('src/browser/main.js', 'utf8');

    expect(source).toContain(
      "import { createMainHandle } from '../core/browser/main.js';"
    );
    expect(source).toContain('const handle = createMainHandle({');
  });
});
