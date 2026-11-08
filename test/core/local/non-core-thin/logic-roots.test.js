import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getNonCoreThinStatus,
  nonCoreThinStatusTestOnly,
} from '../../../../src/core/local/non-core-thin/status.js';
import { getBuildEntrypointPatternFailures } from '../../../../src/core/build/entrypoint-pattern.js';

const largeSource = Array.from(
  { length: 51 },
  (_, index) => `const value${index} = ${index};`
).join('\n');
let repoRoot;
beforeEach(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-thin-roots-'));
  fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
});
afterEach(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

/**
 * Write a fixture in the temporary repository.
 * @param {string} file Relative path.
 * @param {string} source Source text.
 */
function put(file, source) {
  const target = path.join(repoRoot, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

/**
 * Run the real filesystem policy against this temporary repository.
 * @param {string} [srcDir] Source directory override.
 * @returns {ReturnType<typeof getNonCoreThinStatus>} Complete policy status.
 */
function status(srcDir) {
  return getNonCoreThinStatus({
    repoRoot,
    fsModule: fs,
    pathModule: path,
    srcDir,
  });
}

test.each([
  'src/core/domain.js',
  'src/logic/core/domain.js',
  'src/logic/boundary/parse.js',
])('classifies %s as logic rather than a large adapter', file => {
  put(file, largeSource);
  expect(status()).toMatchObject({
    isClean: true,
    fileCount: 0,
    exemptionCount: 0,
    violations: [],
    patternViolations: [],
  });
});

test.each([
  'src/logic/helpers.js',
  'src/logic/core-extra/domain.js',
  'src/logic/boundary-extra/domain.js',
  'src/core-extra/domain.js',
  'src/local/adapter.js',
])('retains the size gate for %s', file => {
  put(file, largeSource);
  expect(status()).toMatchObject({
    isClean: false,
    fileCount: 1,
    violations: [{ filePath: file, lines: 51 }],
  });
});

test('source-directory overrides retain exact logic classification', () => {
  put('custom/core/domain.js', largeSource);
  put('custom/logic/core/domain.js', largeSource);
  put('custom/logic/boundary/parse.js', largeSource);
  put('custom/logic/adapter.js', largeSource);
  expect(status('custom')).toMatchObject({
    isClean: false,
    fileCount: 1,
    violations: [{ filePath: 'custom/logic/adapter.js', lines: 51 }],
  });
});

test('logic does not become an adapter exemption and stale exemptions still fail', () => {
  put('src/logic/core/domain.js', largeSource);
  put(
    'non-core-thin-exemptions.json',
    JSON.stringify({
      maxLines: 50,
      exemptions: { 'src/logic/core/domain.js': 'old adapter' },
    })
  );
  expect(status()).toMatchObject({
    isClean: false,
    fileCount: 0,
    exemptionCount: 1,
    staleExemptions: ['src/logic/core/domain.js'],
  });
});

test.each(['core', 'logic/core', 'logic/boundary'])(
  'recognizes pure re-export wrappers from %s',
  root => {
    const source = `export { factory } from '../${root}/domain.js';`;
    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
        'src/local/wrapper.js',
        source
      )
    ).toEqual([]);
  }
);

test.each(['logic', 'logic/core-extra', 'logic/boundary-extra'])(
  'does not classify re-exports from %s as logic',
  root => {
    expect(
      nonCoreThinStatusTestOnly.getWrapperPatternViolationsForSource(
        'src/local/wrapper.js',
        `export { factory } from '../${root}/domain.js';`
      )
    ).toHaveLength(1);
  }
);

test.each(['core', 'logic/core', 'logic/boundary'])(
  'build entrypoint accepts one %s logic import and an environment import',
  root => {
    const source = `#!/usr/bin/env node\nimport { environmentDependencies } from './environment.js';\nimport { createCopyCore } from '../${root}/copy.js';\ncreateCopyCore(environmentDependencies).runCopyWorkflow();`;
    expect(
      getBuildEntrypointPatternFailures({
        entrypoints: ['src/build/copy.js'],
        readSource: () => source,
      })
    ).toEqual([]);
  }
);
