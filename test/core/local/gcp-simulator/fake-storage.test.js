import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { describe, expect, it, afterEach } from '@jest/globals';
import { FakeStorage } from '../../../../src/core/local/gcp-simulator/fake-storage.js';

describe('fake storage', () => {
  /** @type {string | null} */
  let rootDir = null;

  afterEach(async () => {
    if (rootDir) {
      await rm(rootDir, { recursive: true, force: true });
      rootDir = null;
    }
  });

  it('saves and downloads text and binary payloads', async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'dadeto-fake-storage-'));
    const storage = new FakeStorage({ rootDir });
    const bucket = storage.bucket('bucket-a');

    const textFile = bucket.file('/nested/story.txt');
    await textFile.save('hello');
    expect(await textFile.exists()).toEqual([true]);
    expect((await textFile.download())[0].toString('utf8')).toBe('hello');

    const bufferFile = bucket.file('buffer.bin');
    await bufferFile.save(Buffer.from([1, 2, 3]));
    expect((await bufferFile.download())[0]).toEqual(Buffer.from([1, 2, 3]));

    const bytesFile = bucket.file('bytes.bin');
    await bytesFile.save(new Uint8Array([4, 5]));
    expect((await bytesFile.download())[0]).toEqual(Buffer.from([4, 5]));

    expect(await bucket.file('missing.txt').exists()).toEqual([false]);
  });
});
