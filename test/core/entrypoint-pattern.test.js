import {
  createBuildEntrypointPatternHandle,
  getBuildEntrypointPatternFailures,
} from '../../src/core/build/entrypoint-pattern.js';

const validSource = `#!/usr/bin/env node
import { environmentDependencies } from './environment.js';
import { createCopyCore } from '../core/copy.js';
const environmentDependencies = {};
executeCopyDendriteWorkflow(environmentDependencies);
createCopyCore(environmentDependencies).runCopyWorkflow();
`;

test('command reads the configured entrypoints and reports migrated logic success', () => {
  const reads = [];
  const logs = [];
  const errors = [];
  const exits = [];
  const handle = createBuildEntrypointPatternHandle({
    readJson: file => {
      reads.push(file);
      return { entrypoints: ['src/build/copy.js'] };
    },
    readSource: file => {
      reads.push(file);
      return validSource.replace('../core/', '../logic/core/');
    },
    output: { log: line => logs.push(line), error: line => errors.push(line) },
    setExitCode: code => exits.push(code),
  });
  expect(handle()).toBeUndefined();
  expect(reads).toEqual([
    'src/build/entrypoint-patterns.json',
    'src/build/copy.js',
  ]);
  expect(logs).toEqual([
    'Checked 1 build entrypoints for the object-passing pattern.',
  ]);
  expect(errors).toEqual([]);
  expect(exits).toEqual([]);
});

test('command reports configured entrypoint failures and propagates reader errors', () => {
  const errors = [];
  const logs = [];
  const exits = [];
  createBuildEntrypointPatternHandle({
    readJson: () => ({ entrypoints: ['src/build/bad.js'] }),
    readSource: () => '',
    output: { log: line => logs.push(line), error: line => errors.push(line) },
    setExitCode: code => exits.push(code),
  })();
  expect(logs).toEqual([]);
  expect(exits).toEqual([1]);
  expect(errors).toEqual([
    'src/build/bad.js: missing shebang',
    'src/build/bad.js: imports are not in the expected env/core split',
    'src/build/bad.js: required direct execution pattern snippets are missing',
  ]);
  const failure = new Error('configuration unreadable');
  const handle = createBuildEntrypointPatternHandle({
    readJson: () => {
      throw failure;
    },
    readSource: () => '',
    output: { log() {}, error() {} },
    setExitCode() {},
  });
  expect(handle).toThrow(failure);
});

describe('getBuildEntrypointPatternFailures', () => {
  test('preserves the line-start function heuristic with whitespace and nested declarations', () => {
    const check = source =>
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/copy.js'],
        readSource: () => source,
      });
    expect(
      check(`${validSource}\nconst create = () => { function nested() {} };`)
    ).toEqual([]);
    expect(check(`${validSource}\nfunction   manySpaces() {}`)).toEqual([
      'src/build/copy.js: top-level functions are not allowed',
    ]);
  });
  it('accepts an entrypoint with the complete direct-execution pattern', () => {
    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/copy.js'],
        readSource: () => validSource,
      })
    ).toEqual([]);
  });

  it('reports every missing pattern requirement', () => {
    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/bad.js'],
        readSource: () => 'function helper() {}\nconst value = true;',
      })
    ).toEqual([
      'src/build/bad.js: missing shebang',
      'src/build/bad.js: imports are not in the expected env/core split',
      'src/build/bad.js: top-level functions are not allowed',
      'src/build/bad.js: required direct execution pattern snippets are missing',
    ]);
  });

  it('requires one core import, one environment import, and direct snippets', () => {
    [
      [
        validSource.replace(
          "import { createCopyCore } from '../core/copy.js';",
          ''
        ),
        'imports are not in the expected env/core split',
      ],
      [
        validSource.replace(
          "import { environmentDependencies } from './environment.js';",
          ''
        ),
        'imports are not in the expected env/core split',
      ],
      [
        validSource
          .replace('executeCopyDendriteWorkflow(environmentDependencies);', '')
          .replace(
            'createCopyCore(environmentDependencies).runCopyWorkflow();',
            ''
          )
          .replace('const environmentDependencies = {};', ''),
        'required direct execution pattern snippets are missing',
      ],
    ].forEach(([source, message]) => {
      expect(
        getBuildEntrypointPatternFailures({
          entrypoints: ['src/build/variant.js'],
          readSource: () => source,
        })
      ).toContain(`src/build/variant.js: ${message}`);
    });

    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/variant.js'],
        readSource: () =>
          validSource
            .replace(
              'executeCopyDendriteWorkflow(environmentDependencies);',
              ''
            )
            .replace(
              'createCopyCore(environmentDependencies).runCopyWorkflow();',
              ''
            ),
      })
    ).not.toContain(
      'src/build/variant.js: required direct execution pattern snippets are missing'
    );
  });

  it('distinguishes import cardinality and top-level function syntax', () => {
    const duplicateCore = validSource.replace(
      "import { environmentDependencies } from './environment.js';",
      "import { another } from '../core/another.js';\nimport { environmentDependencies } from './environment.js';"
    );
    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/duplicate.js'],
        readSource: () => duplicateCore,
      })
    ).toContain(
      'src/build/duplicate.js: imports are not in the expected env/core split'
    );

    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/function.js'],
        readSource: () => `${validSource}\nfunction $helper() {}`,
      })
    ).toContain('src/build/function.js: top-level functions are not allowed');
  });
});
