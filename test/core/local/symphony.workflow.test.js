import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  loadSymphonyWorkflow,
  summarizeWorkflow,
} from '../../../src/core/local/symphony/workflow.js';

const promptTemplateKey = 'prompt_template';

describe('Symphony workflow core', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dadeto-workflow-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('summarizes front matter, scalars, and all documented sections', () => {
    const summary = summarizeWorkflow(`---
# comment
enabled: true
retries: -2
ratio: 1.5
name:  value
disabled: false
invalid
: missing key

---
# Workflow
## Allowed command families
- npm test
- git status
## Required quality gates
Quality gates:
- check
## Handoff requirements
- push
## End
- ignored
`);

    expect(summary).toMatchObject({
      exists: true,
      lineCount: 23,
      config: { enabled: true, retries: -2, ratio: 1.5, name: 'value' },
      [promptTemplateKey]: expect.stringContaining('# Workflow'),
      allowedCommandFamilies: ['npm test', 'git status'],
      requiredQualityGates: ['check'],
      handoffRequirements: ['push'],
    });
  });

  test('handles documents without or with incomplete front matter', () => {
    expect(summarizeWorkflow('plain text').config).toEqual({});
    expect(summarizeWorkflow('---\nname: value')[promptTemplateKey]).toBe(
      '---\nname: value'
    );
    expect(summarizeWorkflow('## Other\n- item')).toMatchObject({
      allowedCommandFamilies: [],
      requiredQualityGates: [],
      handoffRequirements: [],
    });
  });

  test('loads an existing workflow and returns a missing-file scaffold', async () => {
    const workflowPath = path.join(tempDir, 'WORKFLOW.md');
    await writeFile(workflowPath, '---\nmode: prod\n---\nPrompt\n', 'utf8');
    await expect(
      loadSymphonyWorkflow({
        repoRoot: tempDir,
        pathModule: path,
        readFileImpl: readFile,
      })
    ).resolves.toMatchObject({
      path: workflowPath,
      exists: true,
      config: { mode: 'prod' },
    });

    await expect(
      loadSymphonyWorkflow({
        repoRoot: path.join(tempDir, 'missing'),
        pathModule: path,
        readFileImpl: readFile,
      })
    ).resolves.toMatchObject({
      exists: false,
      lineCount: 0,
      config: {},
      [promptTemplateKey]: '',
    });
  });

  test('propagates non-missing read failures', async () => {
    await expect(loadSymphonyWorkflow()).rejects.toThrow(
      'pathModule is required'
    );
    await expect(
      loadSymphonyWorkflow({
        workflowPath: path.join(tempDir, 'workflow.md'),
        pathModule: path,
        readFileImpl: async () => {
          const error = new Error('permission denied');
          error.code = 'EACCES';
          throw error;
        },
      })
    ).rejects.toThrow('permission denied');
  });
});
