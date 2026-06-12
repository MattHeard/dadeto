import fs from 'node:fs';
import path from 'node:path';
import {
  getNonCoreThinStatus,
  nonCoreThinStatusTestOnly,
} from '../../../../src/core/local/non-core-thin/status.js';

describe('non-core thin status', () => {
  test('creates a clean check command handle', () => {
    const logs = [];
    const errors = [];
    const exitCodes = [];
    const handle = createTestCheckHandle({
      status: {
        isClean: true,
        fileCount: 2,
        exemptionCount: 0,
        maxLines: 50,
      },
      logs,
      errors,
      exitCodes,
    });

    expect(handle()).toEqual({ exitCode: 0, failures: [] });

    expect(logs).toEqual([
      'Checked 2 non-core JS files; 0 baseline exemptions; max 50 lines.',
    ]);
    expect(errors).toEqual([]);
    expect(exitCodes).toEqual([]);
  });

  test('creates a failing check command handle', () => {
    const logs = [];
    const errors = [];
    const exitCodes = [];
    const status = {
      isClean: false,
      fileCount: 2,
      exemptionCount: 0,
      maxLines: 50,
    };
    const handle = createTestCheckHandle({
      status,
      logs,
      errors,
      exitCodes,
    });

    expect(handle()).toEqual({ exitCode: 1, failures: ['failure line'] });

    expect(logs).toEqual([]);
    expect(errors).toEqual(['failure line']);
    expect(exitCodes).toEqual([1]);
  });

  test('reports the current repo status', () => {
    const status = getNonCoreThinStatus({
      fsModule: fs,
      pathModule: path,
      repoRoot: process.cwd(),
    });

    expect(status).toMatchObject({ maxLines: 50 });
    expect(status.exemptionCount).toEqual(expect.any(Number));
    expect(status.fileCount).toBeGreaterThan(0);
    expect(status.staleExemptions).toEqual([]);
    expect(status.isClean).toBe(true);
    expect(status.exemptionCount).toBe(0);
    expect(status.violations).toEqual([]);
    expect(status.patternViolations).toEqual([]);
  });

  test('builds a clean status and reports stale exemptions when data says so', () => {
    expect(
      nonCoreThinStatusTestOnly.buildNonCoreThinStatus(
        { maxLines: 50, exemptions: {} },
        [],
        {
          fsModule: {
            readFileSync: () => '',
          },
          pathModule: path,
          repoRoot: '/repo',
          srcDir: '/repo/src',
        }
      )
    ).toEqual({
      isClean: true,
      maxLines: 50,
      fileCount: 0,
      exemptionCount: 0,
      staleExemptions: [],
      violations: [],
      patternViolations: [],
    });

    expect(
      nonCoreThinStatusTestOnly.buildNonCoreThinStatus(
        {
          maxLines: 1,
          exemptions: {
            'src/browser/missing.js': 'stale',
          },
        },
        ['src/browser/document.js'],
        {
          fsModule: {
            readFileSync: filePath =>
              filePath.endsWith('document.js')
                ? [
                    "import { createDocumentHandle } from './document-core.js';",
                    'const handle = createDocumentHandle();',
                    'export { handle };',
                  ].join('\n')
                : '',
          },
          pathModule: path,
          repoRoot: '/repo',
          srcDir: '/repo/src',
        }
      )
    ).toEqual({
      isClean: false,
      maxLines: 1,
      fileCount: 1,
      exemptionCount: 1,
      staleExemptions: ['src/browser/missing.js'],
      violations: [
        {
          filePath: 'src/browser/document.js',
          lines: expect.any(Number),
        },
      ],
      patternViolations: [],
    });
  });

  test('reports wrapper shape violations separately from size violations', () => {
    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
        'src/browser/empty.js',
        '',
        0
      )
    ).toEqual([
      {
        filePath: 'src/browser/empty.js',
        reason:
          'expected `const handle = coreFactory(...)` in this non-core wrapper',
      },
    ]);

    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
        'src/browser/document.js',
        [
          'const value = 1;',
          'const other = 2;',
          'const third = 3;',
          'const fourth = 4;',
        ].join('\n'),
        3
      )
    ).toEqual([
      {
        filePath: 'src/browser/document.js',
        reason:
          'expected `const handle = coreFactory(...)` in this non-core wrapper',
      },
    ]);

    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolations(
        'src/core/local/non-core-thin/status.js',
        new Set(),
        0,
        {
          fsModule: {
            readFileSync: () => '',
          },
          pathModule: path,
          repoRoot: '/repo',
        }
      )
    ).toEqual([]);
  });

  test('formats failure output with a final summary count', () => {
    expect(
      nonCoreThinStatusTestOnly.formatNonCoreThinFailure({
        fileCount: 2,
        maxLines: 50,
        staleExemptions: ['src/browser/missing.js'],
        violations: [
          {
            filePath: 'src/browser/document.js',
            lines: 51,
          },
        ],
        patternViolations: [
          {
            filePath: 'src/browser/document.js',
            reason:
              'expected `const handle = coreFactory(...)` in this non-core wrapper',
          },
        ],
      })
    ).toEqual([
      'Stale non-core thin exemption: src/browser/missing.js',
      'src/browser/document.js has 51 lines; max non-core size is 50.',
      'src/browser/document.js does not match non-core wrapper shape: expected `const handle = coreFactory(...)` in this non-core wrapper',
      'Non-core thin check found 1 violation, 1 wrapper violation, and 1 stale exemption across 2 files.',
    ]);
  });

  test('accepts wrapper files that export or invoke handle', () => {
    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
        'src/cloud/example/index.js',
        [
          "import { createExampleHandle } from './example-core.js';",
          'const handle = createExampleHandle(functions, getFirestoreInstance);',
          'export { handle };',
        ].join('\n')
      )
    ).toEqual([]);

    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
        'src/scripts/example.js',
        [
          "import { createScriptHandle } from '../core/scripts/example.js';",
          'const handle = createScriptHandle(process);',
          'await handle();',
        ].join('\n')
      )
    ).toEqual([]);
  });

  test('rejects wrapper files that leave handle unused', () => {
    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
        'src/scripts/example.js',
        [
          "import { createScriptHandle } from '../core/scripts/example.js';",
          'const handle = createScriptHandle(process);',
        ].join('\n')
      )
    ).toEqual([
      {
        filePath: 'src/scripts/example.js',
        reason: 'expected the declared `handle` to be exported or invoked',
      },
    ]);
  });
});

/**
 * Create a check command handle with captured output.
 * @param {{
 *   status: { isClean: boolean, fileCount: number, exemptionCount: number, maxLines: number },
 *   logs: string[],
 *   errors: string[],
 *   exitCodes: number[],
 * }} options Test handle options.
 * @returns {() => void} Check command handle.
 */
function createTestCheckHandle({ status, logs, errors, exitCodes }) {
  return nonCoreThinStatusTestOnly.createCheckNonCoreThinHandle({
    getStatus: () => status,
    formatFailure: currentStatus =>
      currentStatus.isClean ? [] : ['failure line'],
    output: {
      error: line => errors.push(line),
      log: line => logs.push(line),
    },
    setExitCode: exitCode => {
      exitCodes.push(exitCode);
    },
  });
}
