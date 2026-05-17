import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  canPruneTrailingDraft,
  createDocumentStoreCore,
  pruneTrailingDrafts,
  renumberDraftSteps,
  shouldKeepStepContent,
} from '../../../src/core/local/documentStore.js';
import {
  DEFAULT_SEQUENCE,
  extractLevelOneHeading,
  getDraftNumber,
  hasOnlyLevelOneHeading,
  isDraftId,
  normalizeWorkflow,
} from '../../../src/core/local/workflow.js';

/**
 * Build a default injected dependency set for the core document store.
 * @param {object} [overrides] Optional dependency overrides.
 * @returns {ReturnType<typeof createDocumentStoreCore>} Dependency bag.
 */
function createDeps(overrides = {}) {
  return {
    mkdir,
    readFile,
    rm,
    writeFile,
    path,
    cwd: () => process.cwd(),
    normalizeWorkflow,
    extractLevelOneHeading,
    hasOnlyLevelOneHeading,
    isDraftId,
    getDraftNumber,
    defaultSequence: DEFAULT_SEQUENCE,
    now: () => new Date('2026-05-17T00:00:00.000Z'),
    ...overrides,
  };
}

describe('createDocumentStoreCore', () => {
  let tempDir;
  let workflowPath;
  let workflowDir;
  let legacyDocumentPath;

  beforeEach(async () => {
    tempDir = await mkdtemp(
      path.join(os.tmpdir(), 'dadeto-core-document-store-')
    );
    workflowPath = path.join(tempDir, 'workflow', 'workflow.json');
    workflowDir = path.join(tempDir, 'workflow');
    legacyDocumentPath = path.join(tempDir, 'writer.md');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('bootstraps from legacy markdown and persists the initial workflow', async () => {
    await mkdir(path.dirname(legacyDocumentPath), { recursive: true });
    await writeFile(
      legacyDocumentPath,
      '# Thesis\n\n## Notes\n\nStarter content',
      'utf8'
    );

    const store = createDocumentStoreCore(createDeps(), {
      workflowPath,
      workflowDir,
      legacyDocumentPath,
    });
    const workflow = await store.loadWorkflow();

    expect(workflow.documents[0]).toMatchObject({
      id: 'thesis',
      title: 'Thesis',
      content: '# Thesis\n\n## Notes\n\nStarter content',
    });
    await expect(readFile(workflowPath, 'utf8')).resolves.toContain('Thesis');
  });

  test('uses default local paths when no store options are provided', () => {
    const store = createDocumentStoreCore(createDeps());

    expect(store.workflowPath).toContain(
      path.join('local-data', 'writer-workflow', 'workflow.json')
    );
  });

  test('rethrows unexpected read errors', async () => {
    const store = createDocumentStoreCore(
      createDeps({
        readFile: async filePath => {
          const error = new Error('missing');
          error.code = filePath === workflowPath ? 'ENOENT' : 'EACCES';
          throw error;
        },
        mkdir: async () => {},
        rm: async () => {},
        writeFile: async () => {},
      }),
      {
        workflowPath,
        workflowDir,
        legacyDocumentPath,
      }
    );

    await expect(store.loadWorkflow()).rejects.toThrow('missing');
  });

  test('rethrows unexpected workflow read errors before fallback', async () => {
    const store = createDocumentStoreCore(
      createDeps({
        readFile: async filePath => {
          const error = new Error(
            filePath === workflowPath ? 'denied' : 'missing'
          );
          error.code = filePath === workflowPath ? 'EACCES' : 'ENOENT';
          throw error;
        },
        mkdir: async () => {},
        rm: async () => {},
        writeFile: async () => {},
      }),
      {
        workflowPath,
        workflowDir,
        legacyDocumentPath,
      }
    );

    await expect(store.loadWorkflow()).rejects.toThrow('denied');
  });

  test('rejects unknown documents when a workflow already exists', async () => {
    await mkdir(path.dirname(workflowPath), { recursive: true });
    await writeFile(
      workflowPath,
      JSON.stringify(
        normalizeWorkflow({
          heading: 'Working Title',
          steps: DEFAULT_SEQUENCE,
        }),
        null,
        2
      ),
      'utf8'
    );

    const store = createDocumentStoreCore(createDeps(), {
      workflowPath,
      workflowDir,
      legacyDocumentPath,
    });

    await expect(store.saveDocument('unknown', 'content')).rejects.toThrow(
      'Unknown document id: unknown'
    );
  });

  test('skips moving backwards and keeps the active index within range', async () => {
    await mkdir(path.dirname(workflowPath), { recursive: true });
    await writeFile(
      workflowPath,
      JSON.stringify(
        normalizeWorkflow({
          heading: 'Working Title',
          steps: [
            { id: 'thesis', title: 'Thesis' },
            { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
            { id: 'outline', title: 'Outline' },
            { id: 'draft-1', title: 'Draft 1' },
          ],
          activeIndex: 3,
        }),
        null,
        2
      ),
      'utf8'
    );
    await mkdir(path.join(workflowDir, 'documents'), { recursive: true });
    await writeFile(
      path.join(workflowDir, 'documents', 'draft-1.md'),
      '# Working Title',
      'utf8'
    );

    const store = createDocumentStoreCore(createDeps(), {
      workflowPath,
      workflowDir,
      legacyDocumentPath,
    });

    const moved = await store.moveActiveIndex(0);
    expect(moved.activeIndex).toBe(3);

    const clamped = await store.setActiveIndex(999);
    expect(clamped.activeIndex).toBe(3);
  });

  test('handles sparse stored workflows and preserves draft content when it is not empty', async () => {
    const sparseStore = createDocumentStoreCore(
      createDeps({
        readFile: async filePath => {
          if (filePath === workflowPath) {
            return JSON.stringify({ ok: true });
          }

          if (filePath.endsWith('draft-1.md')) {
            return 'Body text';
          }

          const error = new Error('missing');
          error.code = 'ENOENT';
          throw error;
        },
        normalizeWorkflow: () => ({
          heading: 'Working Title',
          activeIndex: 0,
          steps: [
            { id: 'thesis', title: 'Thesis' },
            { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
            { id: 'outline', title: 'Outline' },
            ,
          ],
        }),
        mkdir: async () => {},
        rm: async () => {},
        writeFile: async () => {},
      }),
      {
        workflowPath,
        workflowDir,
        legacyDocumentPath,
      }
    );

    const sparseWorkflow = await sparseStore.loadWorkflow();
    expect(sparseWorkflow.activeIndex).toBe(1);
    expect(sparseWorkflow.documents).toHaveLength(4);
    expect(sparseWorkflow.documents.at(-1)).toMatchObject({
      id: 'draft-1',
      title: 'Draft 1',
      content: 'Body text',
    });

    const renumberStore = createDocumentStoreCore(
      createDeps({
        normalizeWorkflow: () => ({
          heading: 'Working Title',
          activeIndex: 0,
          steps: [
            { id: 'thesis', title: 'Thesis' },
            { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
            { id: 'outline', title: 'Outline' },
            { id: 'draft-2', title: 'Draft 2' },
            { id: 'draft-4', title: 'Draft 4' },
          ],
        }),
      }),
      {
        workflowPath,
        workflowDir,
        legacyDocumentPath,
      }
    );

    await mkdir(path.dirname(workflowPath), { recursive: true });
    await writeFile(workflowPath, JSON.stringify({ ok: true }), 'utf8');
    await mkdir(path.join(workflowDir, 'documents'), { recursive: true });
    await writeFile(
      path.join(workflowDir, 'documents', 'draft-1.md'),
      '## Keep this draft',
      'utf8'
    );
    await writeFile(
      path.join(workflowDir, 'documents', 'draft-2.md'),
      'Body text',
      'utf8'
    );

    const renumberedWorkflow = await renumberStore.loadWorkflow();
    expect(renumberedWorkflow.documents).toHaveLength(4);
    expect(renumberedWorkflow.documents.at(-1)).toMatchObject({
      id: 'draft-1',
      title: 'Draft 1',
      content: '## Keep this draft',
    });
  });

  test('keeps a trailing draft when it has body content', async () => {
    await mkdir(path.dirname(workflowPath), { recursive: true });
    await writeFile(workflowPath, JSON.stringify({ ok: true }), 'utf8');
    await mkdir(path.join(workflowDir, 'documents'), { recursive: true });
    await writeFile(
      path.join(workflowDir, 'documents', 'draft-1.md'),
      'Body text',
      'utf8'
    );

    const store = createDocumentStoreCore(
      createDeps({
        normalizeWorkflow: () => ({
          heading: 'Working Title',
          activeIndex: 3,
          steps: [
            { id: 'thesis', title: 'Thesis' },
            { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
            { id: 'outline', title: 'Outline' },
            { id: 'draft-1', title: 'Draft 1' },
          ],
        }),
      }),
      {
        workflowPath,
        workflowDir,
        legacyDocumentPath,
      }
    );

    const workflow = await store.loadWorkflow();
    expect(workflow.documents).toMatchObject([
      { id: 'thesis', title: 'Thesis', content: '' },
      {
        id: 'syllogistic-argument',
        title: 'Syllogistic Argument',
        content: '',
      },
      { id: 'outline', title: 'Outline', content: '' },
      { id: 'draft-1', title: 'Draft 1', content: 'Body text' },
    ]);
  });

  test('prune helpers keep content when the trailing draft has real text', async () => {
    expect(shouldKeepStepContent(createDeps(), 'Body text')).toBe(true);
    expect(shouldKeepStepContent(createDeps(), '# Heading only')).toBe(false);
    expect(
      canPruneTrailingDraft(createDeps(), {
        activeIndex: 0,
        steps: [
          { id: 'thesis', title: 'Thesis' },
          { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
          { id: 'outline', title: 'Outline' },
          { id: 'draft-1', title: 'Draft 1' },
          { id: 'draft-2', title: 'Draft 2' },
        ],
      })
    ).toBe(true);
  });

  test('pruneTrailingDrafts stops when the trailing draft has body text', async () => {
    const state = {
      deps: {
        readFile: async () => 'Body text',
        rm: async () => {
          throw new Error('should not remove');
        },
        path,
      },
      documentDir: path.join(tempDir, 'workflow', 'documents'),
      workflowDir: path.join(tempDir, 'workflow'),
      workflowPath,
    };

    const workflow = {
      activeIndex: 0,
      steps: [
        { id: 'thesis', title: 'Thesis' },
        { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
        { id: 'outline', title: 'Outline' },
        { id: 'draft-1', title: 'Draft 1' },
        { id: 'draft-2', title: 'Draft 2' },
      ],
    };

    await expect(pruneTrailingDrafts(state, workflow)).resolves.toBe(workflow);
  });

  test('renumbers mismatched draft identifiers in sequence', () => {
    const workflow = {
      steps: [
        { id: 'thesis', title: 'Thesis' },
        { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
        { id: 'outline', title: 'Outline' },
        { id: 'draft-2', title: 'Draft 2' },
        { id: 'draft-4', title: 'Draft 4' },
      ],
    };

    renumberDraftSteps(createDeps(), workflow);

    expect(workflow.steps.at(-2)).toMatchObject({
      id: 'draft-1',
      title: 'Draft 1',
    });
    expect(workflow.steps.at(-1)).toMatchObject({
      id: 'draft-2',
      title: 'Draft 2',
    });
  });
});
