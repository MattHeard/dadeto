import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('core browser main import', () => {
  it('imports without touching browser globals at module load time', async () => {
    await expect(
      import('../../../src/core/browser/main.js')
    ).resolves.toHaveProperty('createMainHandle');
  });

  it('targets the production GCP error beacon endpoint', async () => {
    const source = await readFile('src/core/browser/main.js', 'utf8');

    expect(source).toContain(
      "https://europe-west1-irien-465710.cloudfunctions.net/prod-errors"
    );
    expect(source).toContain(
      'windowObj.console.error = errorHandlers.logError;'
    );
    expect(source).toContain('windowObj.fetch?.bind(windowObj)');
  });
});
