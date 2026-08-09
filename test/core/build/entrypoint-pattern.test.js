import {
  createBuildEntrypointPatternHandle,
  getBuildEntrypointPatternFailures,
} from '../../../src/core/build/entrypoint-pattern.js';

const VALID_SOURCE = [
  '#!/usr/bin/env node',
  "import fs from 'node:fs';",
  "import { createCopyCore } from '../core/build/blog.js';",
  'const environmentDependencies = { fs };',
  'createCopyCore(environmentDependencies).runCopyWorkflow();',
].join('\n');

describe('build entrypoint pattern', () => {
  test('accepts a valid object-passing entrypoint', () => {
    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/copy.js'],
        readSource: () => VALID_SOURCE,
      })
    ).toEqual([]);
  });

  test('reports all pattern failures for an invalid entrypoint', () => {
    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/bad.js'],
        readSource: () =>
          [
            "import { createCopyCore } from '../core/build/blog.js';",
            'function run() {}',
            'run();',
          ].join('\n'),
      })
    ).toEqual([
      'src/build/bad.js: missing shebang',
      'src/build/bad.js: imports are not in the expected env/core split',
      'src/build/bad.js: top-level functions are not allowed',
      'src/build/bad.js: required direct execution pattern snippets are missing',
    ]);
  });

  test('creates a clean command handle', () => {
    const logs = [];
    const errors = [];
    const exitCodes = [];
    const handle = createTestHandle({
      source: VALID_SOURCE,
      logs,
      errors,
      exitCodes,
    });

    handle();

    expect(logs).toEqual([
      'Checked 1 build entrypoints for the object-passing pattern.',
    ]);
    expect(errors).toEqual([]);
    expect(exitCodes).toEqual([]);
  });

  test('creates a failing command handle', () => {
    const logs = [];
    const errors = [];
    const exitCodes = [];
    const handle = createTestHandle({
      source: '',
      logs,
      errors,
      exitCodes,
    });

    handle();

    expect(logs).toEqual([]);
    expect(errors).toEqual([
      'src/build/copy.js: missing shebang',
      'src/build/copy.js: imports are not in the expected env/core split',
      'src/build/copy.js: required direct execution pattern snippets are missing',
    ]);
    expect(exitCodes).toEqual([1]);
  });
});

/**
 * Create a build entrypoint pattern check handle with captured output.
 * @param {{
 *   source: string,
 *   logs: string[],
 *   errors: string[],
 *   exitCodes: number[],
 * }} options Test handle options.
 * @returns {() => void} Check command handle.
 */
function createTestHandle({ source, logs, errors, exitCodes }) {
  return createBuildEntrypointPatternHandle({
    readJson: () => ({ entrypoints: ['src/build/copy.js'] }),
    readSource: () => source,
    output: {
      error: line => errors.push(line),
      log: line => logs.push(line),
    },
    setExitCode: exitCode => {
      exitCodes.push(exitCode);
    },
  });
}
