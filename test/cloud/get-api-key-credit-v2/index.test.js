import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';

describe('get-api-key-credit-v2 entry point', () => {
  it('resolves Firestore through the environment-aware cloud helper', async () => {
    const source = await readFile(
      'src/cloud/get-api-key-credit-v2/index.js',
      'utf8'
    );
    expect(source).toContain('getFirestoreInstance');
    expect(source).toContain(
      'const db = createDb(getFirestoreInstance({ getFirestoreFn: Firestore }))'
    );
  });
});
