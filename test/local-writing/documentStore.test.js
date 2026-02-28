import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDocumentStore } from '../../src/local-writing/documentStore.js';

describe('documentStore', () => {
  let tempDir;
  let workflowPath;
  let legacyDocumentPath;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dadeto-writer-'));
    workflowPath = path.join(tempDir, 'workflow', 'workflow.json');
    legacyDocumentPath = path.join(tempDir, 'writer.md');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('creates the initial workflow and migrates legacy content into thesis', async () => {
    const store = createDocumentStore({
      workflowPath,
      legacyDocumentPath,
    });

    await store.saveDocument('thesis', '# Thesis');
    const workflow = await store.loadWorkflow();

    expect(workflow.activeIndex).toBe(1);
    expect(workflow.documents.map(document => document.title)).toEqual([
      'Thesis',
      'Syllogistic Argument',
      'Outline',
      'Draft 1',
    ]);
    expect(workflow.documents[0].content).toBe('# Thesis');
  });

  test('saves a named document into the workflow document directory', async () => {
    const store = createDocumentStore({
      workflowPath,
      legacyDocumentPath,
    });

    const result = await store.saveDocument('outline', '1. Intro');
    const content = await readFile(
      path.join(tempDir, 'workflow', 'documents', 'outline.md'),
      'utf8'
    );

    expect(content).toBe('1. Intro');
    expect(result.documentId).toBe('outline');
    expect(result.path).toContain(path.join('workflow', 'documents', 'outline.md'));
  });

  test('paging right from the last draft creates the next draft document', async () => {
    const store = createDocumentStore({
      workflowPath,
      legacyDocumentPath,
    });

    await store.moveActiveIndex(1);
    await store.moveActiveIndex(1);
    const workflow = await store.moveActiveIndex(1);

    expect(workflow.activeIndex).toBe(4);
    expect(workflow.documents.at(-1)?.title).toBe('Draft 2');
    await expect(
      readFile(
        path.join(tempDir, 'workflow', 'documents', 'draft-2.md'),
        'utf8'
      )
    ).resolves.toBe('');
  });
});
