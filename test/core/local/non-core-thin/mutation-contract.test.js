import path from 'node:path';
import { jest } from '@jest/globals';
import {
  getNonCoreThinStatus,
  nonCoreThinStatusTestOnly as policy,
} from '../../../../src/core/local/non-core-thin/status.js';

const missingHandle = [
  {
    filePath: 'src/local/example.js',
    reason:
      'expected `const handle = coreFactory(...)` in this non-core wrapper',
  },
];
const largeSource = Array.from(
  { length: 51 },
  (_, i) => `const value${i} = ${i};`
).join('\n');

test('a clean command avoids formatting or reporting failures', () => {
  const log = jest.fn();
  const formatFailure = jest.fn(() => {
    throw new Error('clean status must not be formatted');
  });
  const handle = policy.createCheckNonCoreThinHandle({
    getStatus: () => ({
      isClean: true,
      fileCount: 3,
      exemptionCount: 0,
      maxLines: 50,
    }),
    formatFailure,
    output: { log, error: jest.fn() },
    setExitCode: jest.fn(),
  });
  expect(handle()).toEqual({ exitCode: 0, failures: [] });
  expect(formatFailure).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith(
    'Checked 3 non-core JS files; 0 baseline exemptions; max 50 lines.'
  );
});

test('active exemptions skip both size and shape while other files retain both failures', () => {
  const result = policy.buildNonCoreThinStatus(
    { maxLines: 50, exemptions: { 'src/local/exempt.js': 'platform adapter' } },
    ['src/local/exempt.js', 'src/local/example.js'],
    {
      repoRoot: '/repo',
      pathModule: path,
      fsModule: { readFileSync: () => largeSource },
    }
  );
  expect(result).toEqual({
    isClean: false,
    maxLines: 50,
    fileCount: 2,
    exemptionCount: 1,
    staleExemptions: [],
    violations: [{ filePath: 'src/local/example.js', lines: 51 }],
    patternViolations: missingHandle,
  });
});

test('exactly the size limit is allowed', () => {
  const source = Array.from(
    { length: 50 },
    (_, i) => `const value${i} = ${i};`
  ).join('\n');
  expect(
    policy.buildNonCoreThinStatus(
      { maxLines: 50, exemptions: {} },
      ['src/local/example.js'],
      {
        repoRoot: '/repo',
        pathModule: path,
        fsModule: { readFileSync: () => source },
      }
    )
  ).toMatchObject({ isClean: true, violations: [], patternViolations: [] });
});

test('a file becoming invalid between reads still fails shape independently of size', () => {
  const readFileSync = jest
    .fn()
    .mockReturnValueOnce('const value = 1;')
    .mockReturnValueOnce(largeSource);
  expect(
    policy.buildNonCoreThinStatus(
      { maxLines: 50, exemptions: {} },
      ['src/local/example.js'],
      { repoRoot: '/repo', pathModule: path, fsModule: { readFileSync } }
    )
  ).toMatchObject({
    isClean: false,
    violations: [],
    patternViolations: missingHandle,
  });
  expect(readFileSync.mock.calls).toEqual([
    ['/repo/src/local/example.js', 'utf8'],
    ['/repo/src/local/example.js', 'utf8'],
  ]);
});

test('directory metadata, JavaScript extension and configuration encoding are honored', () => {
  const readFileSync = jest.fn((file, encoding) => {
    expect(encoding).toBe('utf8');
    if (file.endsWith('non-core-thin-exemptions.json'))
      return JSON.stringify({ maxLines: 7, exemptions: {} });
    return 'const value = 1;';
  });
  const entry = (name, directory, file) => ({
    name,
    isDirectory: () => directory,
    isFile: () => file,
  });
  const readdirSync = directory =>
    directory === '/repo/src'
      ? [
          entry('nested.js', true, false),
          entry('notes.txt', false, true),
          entry('socket.js', false, false),
          entry('run.js', false, true),
        ]
      : [];
  expect(
    getNonCoreThinStatus({
      repoRoot: '/repo',
      pathModule: path,
      fsModule: { readFileSync, readdirSync },
    })
  ).toEqual({
    isClean: true,
    maxLines: 7,
    fileCount: 1,
    exemptionCount: 0,
    staleExemptions: [],
    violations: [],
    patternViolations: [],
  });
  expect(readFileSync.mock.calls).toEqual([
    ['/repo/non-core-thin-exemptions.json', 'utf8'],
    ['/repo/src/run.js', 'utf8'],
  ]);
});

test.each([
  'src/cloud/example/index.js',
  'src/browser/example.js',
  'src/build/example.js',
  'src/local/example.js',
])('enforces wrapper shape through the filesystem port for %s', filePath => {
  const readFileSync = jest.fn(() => 'const value = 1;');
  expect(
    policy.getWrapperPatternViolations(filePath, 0, {
      repoRoot: '/repo',
      pathModule: path,
      fsModule: { readFileSync },
    })
  ).toEqual([{ filePath, reason: missingHandle[0].reason }]);
  expect(readFileSync).toHaveBeenCalledWith(`/repo/${filePath}`, 'utf8');
});

test.each([
  'src/cloud/example/helper.js',
  'elsewhere/index.js',
  'src/browser-extra/example.js',
  'src/local-extra/example.js',
  'src/build-extra/example.js',
  'elsewhere/src/cloud/example/index.js',
])('does not apply wrapper shape to %s', filePath => {
  const readFileSync = jest.fn(() => {
    throw new Error('unexpected read');
  });
  expect(
    policy.getWrapperPatternViolations(filePath, 0, {
      repoRoot: '/repo',
      pathModule: path,
      fsModule: { readFileSync },
    })
  ).toEqual([]);
  expect(readFileSync).not.toHaveBeenCalled();
});

test.each([
  [2, true],
  [3, true],
  [1, false],
  [0, false],
  [-1, false],
])(
  'two-line platform adapter under limit %s has allowed status %s',
  (limit, allowed) => {
    expect(
      policy.getWrapperPatternViolationsForSource(
        'src/local/example.js',
        'const first = 1;\nconst second = 2;',
        limit
      )
    ).toEqual(allowed ? [] : missingHandle);
  }
);

test.each([
  'const   handle=make();handle();',
  'const handle  =  make   ();handle  ();',
  'const handle=a();handle();',
  'const {handle}=a();handle();',
  'const   { other, handle, more }  =  createLong_2$   ();handle();',
  'const {handle}=maker();handle();',
  'const {handle}= a();handle();',
  'const {handle}=create();export{handle};',
  'handle();\nconst handle=create();',
  'const handle=create();await   handle ();',
  'export   const   handle=create();',
])('preserves supported handle formatting: %s', source => {
  expect(
    policy.getWrapperPatternViolationsForSource('src/local/example.js', source)
  ).toEqual([]);
});

test.each([
  "// full line comment\nexport * from '../../logic/core/domain.js'",
  "  // full line comment\nexport { parse } from '../logic/boundary/parse.js';",
  "export * from '../core/a.js'; \n export { thing } from '../commonCore.js';",
  "export   { thing }  from   '../core/a.js' \n ;",
])('preserves pure re-export formatting: %s', source => {
  expect(
    policy.getWrapperPatternViolationsForSource('src/local/example.js', source)
  ).toEqual([]);
});

test.each([
  ' \n\t ',
  "export { thing } from '../core/a.js'; // inline comment",
  "export { thing } from '../core/a.js';\nconst extra = 1;",
  'const handle=9();handle();',
  'const handle=maker();',
])('keeps unsupported wrapper forms visible: %s', source => {
  expect(
    policy.getWrapperPatternViolationsForSource('src/local/example.js', source)
  ).not.toEqual([]);
});
