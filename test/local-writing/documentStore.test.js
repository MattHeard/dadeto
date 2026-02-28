import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDocumentStore } from '../../src/local-writing/documentStore.js';

describe('documentStore', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dadeto-writer-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('loads empty content when the markdown file does not exist yet', async () => {
    const store = createDocumentStore({
      documentPath: path.join(tempDir, 'draft.md'),
    });

    await expect(store.load()).resolves.toBe('');
  });

  test('saves markdown content to disk and reports metadata', async () => {
    const documentPath = path.join(tempDir, 'nested', 'draft.md');
    const store = createDocumentStore({ documentPath });

    const result = await store.save('# Heading\n\nParagraph');

    await expect(readFile(documentPath, 'utf8')).resolves.toBe(
      '# Heading\n\nParagraph'
    );
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.savedAt).toEqual(expect.any(String));
  });
});
