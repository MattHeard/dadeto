import { describe, expect, it, jest } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { createDb as createCloudDb } from '../../../src/cloud/get-api-key-credit-v2/create-db.js';
import { createDb as createCoreDb } from '../../../src/core/cloud/get-api-key-credit-v2/create-db.js';

describe('createDb', () => {
  it('creates a Firestore instance using the provided constructor via the cloud entry point', () => {
    const instance = {};
    const FakeFirestore = jest.fn().mockImplementation(() => instance);

    const db = createCloudDb(FakeFirestore);

    expect(db).toBe(instance);
    expect(FakeFirestore).toHaveBeenCalledTimes(1);
    expect(FakeFirestore).toHaveBeenCalledWith();
  });

  it('creates a Firestore instance using the provided constructor via the core implementation', () => {
    const instance = {};
    const FakeFirestore = jest.fn().mockImplementation(() => instance);

    const db = createCoreDb(FakeFirestore);

    expect(db).toBe(instance);
    expect(FakeFirestore).toHaveBeenCalledTimes(1);
    expect(FakeFirestore).toHaveBeenCalledWith();
  });
});

describe('Gen2 entry point', () => {
  it('exports a plain HTTP handler without the Firebase v2 wrapper', async () => {
    const source = await readFile(
      'src/cloud/get-api-key-credit-v2/index.js',
      'utf8'
    );
    const gcfSource = await readFile(
      'src/cloud/get-api-key-credit-v2/get-api-key-credit-v2-gcf.js',
      'utf8'
    );

    expect(source).toContain('export async function handle(req, res)');
    expect(source).not.toContain('onRequest');
    expect(gcfSource).not.toContain('firebase-functions/v2/https');
  });
});
