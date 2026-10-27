import { isLogicJavaScriptPath } from './logic-source-paths.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/allow-effects').StartupAllowEffectsBoundary} StartupAllowEffectsBoundary */
/** @typedef {{start?: {line?: number}}} IstanbulCoverageLocation */
/** @typedef {{line?: number, locations?: IstanbulCoverageLocation[]}} IstanbulBranchLocation */
/** @typedef {{statementMap?: Record<string, IstanbulCoverageLocation>, branchMap?: Record<string, IstanbulBranchLocation>, s?: Record<string, number>, f?: Record<string, number>, b?: Record<string, number[]>}} IstanbulCoverageRecord */
/** @typedef {Record<string, IstanbulCoverageRecord>} IstanbulCoverageMap */
/** @typedef {{status: number | null, stdout?: string, stderr?: string, error?: Error, coverage?: IstanbulCoverageMap, command?: string, coverageError?: string}} ScopedCoverageRun */

const SOURCE_ROOT = 'src/';
const UNIT_TEST_ROOT = 'test/';
const SELECTOR_TIMEOUT_MS = 45_000;
const JEST_RUNNER = 'scripts/run-jest.js';

/** @typedef {{changedPaths: string[], tests: string[], testSelection: 'none' | 'related' | 'direct' | 'all-unit', staticGates: string[], commands: string[], authoritative: string}} CheckImpactPlanBase */
/** @typedef {CheckImpactPlanBase & {mode: 'none' | 'fallback', reason: string}} FallbackCheckImpactPlan */
/** @typedef {CheckImpactPlanBase & {mode: 'selected', reason?: undefined}} SelectedCheckImpactPlan */
/** @typedef {FallbackCheckImpactPlan | SelectedCheckImpactPlan} CheckImpactPlan */

/**
 * Normalize a repository-relative path for stable impact plans.
 * @param {unknown} value Path to normalize.
 * @returns {string} Normalized path or an empty string when unsafe.
 */
function normalizePath(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (
    normalized.startsWith('/') ||
    normalized.split('/').includes('..') ||
    normalized.includes('\0') ||
    normalized.includes('\n') ||
    normalized.includes('\r')
  )
    return '';
  return normalized;
}

/**
 * Classify a changed path as supported source or unit-test input.
 * @param {string} path Normalized repository-relative path.
 * @returns {'source' | 'test' | ''} Path kind.
 */
function classifyPath(path) {
  if (path.startsWith(SOURCE_ROOT) && path.endsWith('.js')) return 'source';
  if (
    path.startsWith(UNIT_TEST_ROOT) &&
    path.endsWith('.test.js') &&
    !path.startsWith('test/e2e/')
  )
    return 'test';
  return '';
}

/**
 * Quote one path for a human-readable POSIX command preview.
 * Execution uses argument arrays and never evaluates this string in a shell.
 * @param {string} value Path to quote.
 * @returns {string} Single-quoted shell token.
 */
function quotePath(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/**
 * Build a deterministic plan for affected or fallback unit tests.
 * @param {{ changedPaths?: unknown[], relatedTestPaths?: unknown[], relatedTestsResolved?: boolean, collectionError?: string }} options Plan inputs.
 * @returns {CheckImpactPlan} Impact plan.
 */
export function createCheckImpactPlan({
  changedPaths = [],
  relatedTestPaths = [],
  relatedTestsResolved = false,
  collectionError = '',
} = {}) {
  const changed = [...new Set(changedPaths.map(normalizePath))].sort();
  const invalid = changed.find(path => !path || !classifyPath(path));
  const hasUnsupportedPath = changed.some(path => !path || !classifyPath(path));
  const sourceChanges = changed.filter(path => classifyPath(path) === 'source');
  const directTests = changed.filter(path => classifyPath(path) === 'test');
  const related = [...new Set(relatedTestPaths.map(normalizePath))]
    .filter(path => classifyPath(path) === 'test')
    .sort();
  let reason = collectionError;

  if (!reason && changed.length === 0)
    return {
      mode: 'none',
      changedPaths: [],
      tests: [],
      testSelection: 'none',
      staticGates: [],
      commands: [],
      reason: 'No changed source or unit-test paths were found.',
      authoritative: 'npm run check:full',
    };
  if (!reason && hasUnsupportedPath)
    reason = `Unsupported or unsafe changed path: ${invalid || '(empty)'}.`;
  if (!reason && sourceChanges.length > 0 && !relatedTestsResolved)
    reason = 'Jest related-test discovery did not complete successfully.';
  if (!reason && sourceChanges.length > 0 && related.length === 0)
    reason = 'Jest did not identify related unit tests for changed source.';

  if (reason) {
    return {
      mode: 'fallback',
      changedPaths: changed,
      tests: [],
      testSelection: 'all-unit',
      staticGates: [],
      commands: [
        `node ${JEST_RUNNER} --runInBand --runTestsByPath <unit-test files in bounded shards>`,
      ],
      reason,
      authoritative: 'npm run check:full',
    };
  }

  const tests = [...new Set([...directTests, ...related])].sort();
  const testSelection = sourceChanges.length > 0 ? 'related' : 'direct';
  const commands = [
    `node ${JEST_RUNNER} --runInBand --runTestsByPath ${tests.map(quotePath).join(' ')}`,
  ];
  const staticGates = ['eslint'];
  if (sourceChanges.some(isLogicJavaScriptPath)) {
    staticGates.push('core-parse');
    commands.push('npm run core-parse');
    staticGates.push('duplication');
    commands.push('npm run duplication');
  }
  return {
    mode: 'selected',
    changedPaths: changed,
    tests,
    testSelection,
    staticGates,
    commands,
    authoritative: 'npm run check:full',
  };
}

/**
 * Build a Jest command whose coverage scope is limited to changed core files.
 * @param {{paths: {rootDir: string, pathModule: typeof import('node:path')}, coverageDirectory: string, selection: {tests: string[], sourceFiles: string[]}, environment: Record<string, string | undefined>}} options Command inputs.
 * @returns {{args: string[], command: string, options: import('node:child_process').SpawnSyncOptionsWithStringEncoding}} Executable arguments and a reproduction command.
 */
export function createScopedCoverageCommand({
  paths,
  coverageDirectory,
  selection,
  environment,
}) {
  const { rootDir, pathModule } = paths;
  const { tests, sourceFiles } = selection;
  const threshold = JSON.stringify({
    global: { branches: 0, functions: 0, lines: 0, statements: 0 },
  });
  const args = [
    pathModule.join(rootDir, JEST_RUNNER),
    '--runInBand',
    '--coverage',
    '--coverageReporters=json',
    `--coverageThreshold=${threshold}`,
    '--coverageDirectory',
    coverageDirectory,
    ...sourceFiles.map(file => `--collectCoverageFrom=${file}`),
    '--runTestsByPath',
    ...tests,
  ];
  const displayArgs = [
    'node',
    JEST_RUNNER,
    ...args
      .slice(1)
      .map(argument =>
        argument === coverageDirectory ? '<temporary-coverage-dir>' : argument
      ),
  ];
  const options = commandOptions(rootDir, 120 * 60 * 1000, true);
  options.env = { ...environment, DADETO_COVERAGE_SHARD: '1' };
  return { args, command: displayArgs.map(quotePath).join(' '), options };
}

/**
 * @typedef {object} CheckImpactDependencies
 * @property {string[]} argv Command-line arguments.
 * @property {string} rootDir Repository root.
 * @property {string} processExecPath Node executable path.
 * @property {string} [defaultBaseRef] Optional branch/ref to include in the diff.
 * @property {number} [impactShardSize] Maximum unit-test files per local Jest process.
 * @property {(absolutePath: string) => boolean} [fileExists] Current-worktree file check.
 * @property {typeof import('node:path')} pathModule Path utilities.
 * @property {StartupAllowEffectsBoundary} bindStartupEffectBoundary Permission boundary for synchronous process and output effects.
 * @property {(permission: AllowEffects, command: string, args: string[], options: object) => {status: number | null, stdout?: string, stderr?: string, error?: Error}} runCommand Permission-aware child-process runner.
 * @property {(permission: AllowEffects, tests: string[], sourceFiles: string[]) => ScopedCoverageRun} runCoverage Permission-aware targeted coverage runner.
 * @property {(permission: AllowEffects, output: string) => unknown} writeOutput Permission-aware CLI output writer.
 */

/**
 * Create the planning-only handle. The result describes intended tests; it does not run them.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {() => {exitCode: number}} Synchronous planner handle.
 */
export function createPlanCheckImpactHandle(deps) {
  return () =>
    deps.bindStartupEffectBoundary(permission => runPlan(permission, deps));
}

/**
 * Create the test-only impact runner. It executes only no-coverage Jest commands.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {() => {exitCode: number}} Synchronous runner handle.
 */
export function createRunCheckImpactHandle(deps) {
  return () =>
    deps.bindStartupEffectBoundary(permission => runImpact(permission, deps));
}

/**
 * Create the scoped test and static-gate executor.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {() => {exitCode: number}} Synchronous executor handle.
 */
export function createRunScopedCheckImpactHandle(deps) {
  return () =>
    deps.bindStartupEffectBoundary(permission =>
      runImpact(permission, deps, { includeStaticGates: true })
    );
}

/**
 * Resolve inputs, discover related tests, and print the resulting plan.
 * @param {AllowEffects} permission Permission for process and output effects.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {{exitCode: number}} Successful planning result.
 */
function runPlan(permission, deps) {
  const { plan } = preparePlan(permission, deps);
  deps.writeOutput(permission, `${JSON.stringify(plan, null, 2)}\n`);
  return { exitCode: 0 };
}

/**
 * Resolve inputs, run selected or fallback tests, and print final execution evidence.
 * @param {AllowEffects} permission Permission for process and output effects.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @param {{includeStaticGates?: boolean}} [options] Whether to execute scoped static gates.
 * @returns {{exitCode: number}} Test command exit status.
 */
function runImpact(permission, deps, { includeStaticGates = false } = {}) {
  const { plan, selectorFailure } = preparePlan(permission, deps);
  let exitCode = 0;
  let status = plan.mode === 'none' ? 'skipped' : 'passed';
  let selectedTests = plan.tests;
  let fallbackFailure = '';
  const scopedSourceFiles =
    includeStaticGates && plan.mode === 'selected'
      ? plan.changedPaths.filter(isLogicJavaScriptPath)
      : [];
  /** @type {ScopedCoverageRun[]} */
  const coverageRuns = [];
  const staticChecks = includeStaticGates
    ? runScopedStaticGates(permission, deps, plan)
    : undefined;

  if (plan.testSelection !== 'none') {
    if (plan.testSelection === 'all-unit') {
      const discovery = discoverAllUnitTests(permission, deps);
      selectedTests = discovery.tests;
      fallbackFailure = discovery.error;
    }
    if (selectedTests.length === 0) {
      exitCode = 1;
      status = 'failed';
      fallbackFailure ||= 'Jest did not identify unit test files to execute.';
    } else {
      const shards = partitionTests(
        selectedTests,
        resolveImpactShardSize(deps)
      );
      for (const [index, shard] of shards.entries()) {
        deps.writeOutput(
          permission,
          `Impact tests: starting shard ${index + 1}/${shards.length} (${shard.length} test files).\n`
        );
        const execution =
          scopedSourceFiles.length > 0
            ? deps.runCoverage(permission, shard, scopedSourceFiles)
            : runTestShard(permission, deps, shard);
        if (scopedSourceFiles.length > 0) coverageRuns.push(execution);
        if (execution.stdout) deps.writeOutput(permission, execution.stdout);
        if (execution.stderr) deps.writeOutput(permission, execution.stderr);
        const shardPassed = !execution.error && execution.status === 0;
        deps.writeOutput(
          permission,
          `Impact tests: shard ${index + 1}/${shards.length} ${shardPassed ? 'passed' : 'failed'}.\n`
        );
        if (!shardPassed) {
          exitCode = 1;
          status = 'failed';
        }
      }
    }
  }

  const scopedCoverage =
    scopedSourceFiles.length > 0
      ? createScopedCoverageReport(scopedSourceFiles, coverageRuns, deps)
      : undefined;
  if (
    staticChecks?.some(check => check.result === 'failed') ||
    (scopedCoverage &&
      (scopedCoverage.errors.length > 0 ||
        scopedCoverage.files.some(
          file =>
            !file.collected ||
            file.uncoveredLines.length > 0 ||
            file.uncoveredBranches.length > 0
        )))
  ) {
    exitCode = 1;
    status = 'failed';
  }
  const report = {
    changedPaths: plan.changedPaths,
    selectedTests,
    testSelection: plan.testSelection,
    fallbackReason: plan.testSelection === 'all-unit' ? plan.reason : null,
    selectorFailure,
    fallbackFailure: fallbackFailure || null,
    ...(staticChecks ? { staticChecks } : {}),
    ...(scopedCoverage ? { scopedCoverage } : {}),
    result: status,
    exitStatus: exitCode,
    authoritative: plan.authoritative,
  };
  deps.writeOutput(permission, `${JSON.stringify(report, null, 2)}\n`);
  return { exitCode };
}

/**
 * Summarize only the changed core files reported by scoped Jest coverage.
 * @param {string[]} sourceFiles Changed core source paths.
 * @param {ScopedCoverageRun[]} coverageRuns Coverage shard results.
 * @param {CheckImpactDependencies} deps Path dependencies.
 * @returns {{scope: string, files: Array<{file: string, collected: boolean, uncoveredLines: number[], uncoveredBranches: Array<{line: number, arm: number}>}>, commands: string[], errors: string[], authoritative: string}} Scoped coverage evidence.
 */
function createScopedCoverageReport(sourceFiles, coverageRuns, deps) {
  const expectedFiles = new Set(sourceFiles);
  /** @type {Map<string, IstanbulCoverageRecord>} */
  const records = new Map();
  const errors = [];
  for (const run of coverageRuns) {
    if (run.coverageError) errors.push(run.coverageError);
    for (const [filePath, record] of Object.entries(run.coverage ?? {})) {
      const relativePath = deps.pathModule.isAbsolute(filePath)
        ? deps.pathModule.relative(deps.rootDir, filePath)
        : filePath;
      const normalizedPath = normalizePath(
        relativePath.split(deps.pathModule.sep).join('/')
      );
      if (!expectedFiles.has(normalizedPath)) continue;
      records.set(
        normalizedPath,
        mergeCoverageRecord(records.get(normalizedPath), record)
      );
    }
  }

  const files = sourceFiles.map(file => {
    const record = records.get(file);
    if (!record)
      return {
        file,
        collected: false,
        uncoveredLines: [],
        uncoveredBranches: [],
      };
    return {
      file,
      collected: true,
      uncoveredLines: listUncoveredLines(record),
      uncoveredBranches: listUncoveredBranches(record),
    };
  });
  return {
    scope: 'changed-core-files',
    files,
    commands: coverageRuns.flatMap(run => (run.command ? [run.command] : [])),
    errors,
    authoritative: 'npm run check:full',
  };
}

/**
 * Merge Istanbul coverage counters from separate bounded test shards.
 * @param {IstanbulCoverageRecord | undefined} existing Previously collected file record.
 * @param {IstanbulCoverageRecord} next New shard file record.
 * @returns {IstanbulCoverageRecord} Merged file record.
 */
function mergeCoverageRecord(existing, next) {
  if (!existing) return structuredClone(next);
  return {
    ...existing,
    s: addCoverageCounters(existing.s, next.s),
    f: addCoverageCounters(existing.f, next.f),
    b: addCoverageBranches(existing.b, next.b),
  };
}

/**
 * Sum keyed Istanbul statement or function counters.
 * @param {Record<string, number>} [left] Existing counts.
 * @param {Record<string, number>} [right] New counts.
 * @returns {Record<string, number>} Summed counts.
 */
function addCoverageCounters(left = {}, right = {}) {
  return Object.fromEntries(
    [...new Set([...Object.keys(left), ...Object.keys(right)])].map(key => [
      key,
      (left[key] ?? 0) + (right[key] ?? 0),
    ])
  );
}

/**
 * Sum Istanbul branch-arm counters.
 * @param {Record<string, number[]>} [left] Existing counts.
 * @param {Record<string, number[]>} [right] New counts.
 * @returns {Record<string, number[]>} Summed branch counts.
 */
function addCoverageBranches(left = {}, right = {}) {
  return Object.fromEntries(
    [...new Set([...Object.keys(left), ...Object.keys(right)])].map(key => {
      const leftArms = left[key] ?? [];
      const rightArms = right[key] ?? [];
      return [
        key,
        Array.from(
          { length: Math.max(leftArms.length, rightArms.length) },
          (_, index) => (leftArms[index] ?? 0) + (rightArms[index] ?? 0)
        ),
      ];
    })
  );
}

/**
 * Find uncovered source statement lines in one Istanbul record.
 * @param {IstanbulCoverageRecord} record Istanbul file coverage record.
 * @returns {number[]} Sorted unique line numbers.
 */
function listUncoveredLines(record) {
  const locations = record.statementMap ?? {};
  const counters = record.s ?? {};
  return [
    ...new Set(
      Object.entries(counters)
        .filter(([, count]) => count === 0)
        .flatMap(([key]) => {
          const line = locations[key]?.start?.line;
          return typeof line === 'number' && Number.isInteger(line)
            ? [line]
            : [];
        })
    ),
  ].sort((left, right) => left - right);
}

/**
 * Find uncovered branch arms in one Istanbul record.
 * @param {IstanbulCoverageRecord} record Istanbul file coverage record.
 * @returns {Array<{line: number, arm: number}>} Missed branch locations.
 */
function listUncoveredBranches(record) {
  const locations = record.branchMap ?? {};
  const branches = record.b ?? {};
  return Object.entries(branches).flatMap(([key, counts]) =>
    counts.flatMap((count, index) => {
      if (count !== 0) return [];
      const branch = locations[key];
      const line = branch?.locations?.[index]?.start?.line ?? branch?.line;
      return typeof line === 'number' && Number.isInteger(line)
        ? [{ line, arm: index + 1 }]
        : [];
    })
  );
}

/**
 * Run only static gates whose scope is supported by the impact plan.
 * @param {AllowEffects} permission Permission for process and output effects.
 * @param {CheckImpactDependencies} deps CLI effects.
 * @param {ReturnType<typeof createCheckImpactPlan>} plan Prepared impact plan.
 * @returns {Array<{name: string, command: string[], result: 'passed' | 'failed' | 'not-run', exitStatus: number | null, reason?: string}>} Static-gate outcomes.
 */
function runScopedStaticGates(permission, deps, plan) {
  if (plan.mode === 'none') return [];
  if (plan.mode === 'fallback') {
    const { reason } = plan;
    deps.writeOutput(
      permission,
      `Impact static checks: not run because the path selection fell back. ${reason}\n`
    );
    return [
      {
        name: 'static-gates',
        command: [],
        result: 'not-run',
        exitStatus: null,
        reason,
      },
    ];
  }

  const checks = [];
  const eslintCli = deps.pathModule.join(
    deps.rootDir,
    'node_modules',
    'eslint',
    'bin',
    'eslint.js'
  );
  checks.push(
    runScopedStaticGate(permission, deps, 'eslint', [
      deps.processExecPath,
      eslintCli,
      '--max-warnings=0',
      '--no-cache',
      '--no-color',
      ...plan.changedPaths,
    ])
  );
  if (plan.staticGates.includes('core-parse')) {
    checks.push(
      runScopedStaticGate(permission, deps, 'core-parse', [
        'npm',
        'run',
        'core-parse',
      ])
    );
  }
  if (plan.staticGates.includes('duplication')) {
    checks.push(
      runScopedStaticGate(permission, deps, 'duplication', [
        'npm',
        'run',
        'duplication',
      ])
    );
  }
  return checks;
}

/**
 * Execute one scoped static gate and capture reproducible command evidence.
 * @param {AllowEffects} permission Permission for process and output effects.
 * @param {CheckImpactDependencies} deps CLI effects.
 * @param {string} name Gate name.
 * @param {[string, ...string[]]} command Executable and its arguments.
 * @returns {{name: string, command: string[], result: 'passed' | 'failed', exitStatus: number, reason?: string}} Gate outcome.
 */
function runScopedStaticGate(permission, deps, name, command) {
  const [executable, ...args] = command;
  deps.writeOutput(permission, `Impact checks: starting ${name}.\n`);
  const execution = deps.runCommand(
    permission,
    executable,
    args,
    commandOptions(deps.rootDir, 10 * 60 * 1000, true)
  );
  if (execution.stdout) deps.writeOutput(permission, execution.stdout);
  if (execution.stderr) deps.writeOutput(permission, execution.stderr);
  const passed = !execution.error && execution.status === 0;
  const exitStatus = passed ? 0 : (execution.status ?? 1);
  deps.writeOutput(
    permission,
    `Impact checks: ${name} ${passed ? 'passed' : 'failed'} (exit ${exitStatus}).\n`
  );
  return {
    name,
    command,
    result: passed ? 'passed' : 'failed',
    exitStatus,
    ...(execution.error ? { reason: execution.error.message } : {}),
  };
}

/**
 * List every unit test for a safe local fallback without enabling coverage.
 * @param {AllowEffects} permission Permission for the Git process effect.
 * @param {CheckImpactDependencies} deps CLI effects.
 * @returns {{tests: string[], error: string}} Sorted paths or a discovery error.
 */
function discoverAllUnitTests(permission, deps) {
  const result = deps.runCommand(
    permission,
    'git',
    ['ls-files', '-co', '--exclude-standard', '-z'],
    commandOptions(deps.rootDir, SELECTOR_TIMEOUT_MS)
  );
  if (result.error || result.status !== 0) {
    return {
      tests: [],
      error:
        result.error?.message ??
        `Git unit-test discovery exited with status ${result.status}.`,
    };
  }
  const candidates = (result.stdout ?? '').split('\0').filter(Boolean);
  return {
    tests: [
      ...new Set(candidates.map(candidate => toUnitTestPath(candidate, deps))),
    ]
      .filter(Boolean)
      .filter(test =>
        deps.fileExists
          ? deps.fileExists(deps.pathModule.resolve(deps.rootDir, test))
          : true
      )
      .sort(),
    error: '',
  };
}

/**
 * Normalize a Git-discovered test path and keep only unit-test files.
 * @param {string} value Jest path candidate.
 * @param {CheckImpactDependencies} deps Path dependencies.
 * @returns {string} Unit-test path or empty string.
 */
function toUnitTestPath(value, deps) {
  const relative = deps.pathModule.isAbsolute(value)
    ? deps.pathModule.relative(deps.rootDir, value)
    : value;
  const normalized = normalizePath(
    relative.split(deps.pathModule.sep).join('/')
  );
  return classifyPath(normalized) === 'test' ? normalized : '';
}

/**
 * Split test paths into serial process-sized groups.
 * @param {string[]} tests Sorted unit-test paths.
 * @param {number} shardSize Maximum tests in each process.
 * @returns {string[][]} Ordered unit-test shards.
 */
function partitionTests(tests, shardSize) {
  const shards = [];
  for (let index = 0; index < tests.length; index += shardSize) {
    shards.push(tests.slice(index, index + shardSize));
  }
  return shards;
}

/**
 * Resolve a safe positive bound for local test shards.
 * @param {CheckImpactDependencies} deps Runner dependencies.
 * @returns {number} Test-file count per process.
 */
function resolveImpactShardSize(deps) {
  const value = deps.impactShardSize ?? 200;
  return Number.isInteger(value) && value > 0 ? value : 200;
}

/**
 * Run one no-coverage Jest shard using a direct argument list.
 * @param {AllowEffects} permission Process permission.
 * @param {CheckImpactDependencies} deps Runner dependencies.
 * @param {string[]} tests Test paths in the shard.
 * @returns {{status: number | null, stdout?: string, stderr?: string, error?: Error}} Process outcome.
 */
function runTestShard(permission, deps, tests) {
  return deps.runCommand(
    permission,
    deps.processExecPath,
    [
      deps.pathModule.join(deps.rootDir, JEST_RUNNER),
      '--runInBand',
      '--runTestsByPath',
      ...tests,
    ],
    commandOptions(deps.rootDir, 120 * 60 * 1000, true)
  );
}

/**
 * Run a Jest command through the shared process boundary.
 * @param {AllowEffects} permission Process permission.
 * @param {CheckImpactDependencies} deps Runner dependencies.
 * @param {string[]} args Jest arguments.
 * @param {number} timeoutMs Process timeout.
 * @returns {{status: number | null, stdout?: string, stderr?: string, error?: Error}} Process outcome.
 */
function runJestCommand(permission, deps, args, timeoutMs) {
  return deps.runCommand(
    permission,
    deps.processExecPath,
    [deps.pathModule.join(deps.rootDir, JEST_RUNNER), ...args],
    commandOptions(deps.rootDir, timeoutMs)
  );
}

/**
 * Collect changes and, when needed, ask Jest for related unit tests.
 * @param {AllowEffects} permission Permission for process effects.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {{plan: ReturnType<typeof createCheckImpactPlan>, selectorFailure: string}} Prepared test plan.
 */
function preparePlan(permission, deps) {
  const input = parseImpactArguments(deps.argv, deps.defaultBaseRef);
  if (input.error)
    return {
      plan: createCheckImpactPlan({ collectionError: input.error }),
      selectorFailure: '',
    };

  const collection = collectChangedPaths(permission, deps, input);
  if (collection.error)
    return {
      plan: createCheckImpactPlan({
        changedPaths: collection.paths,
        collectionError: collection.error,
      }),
      selectorFailure: '',
    };

  const normalized = collection.paths.map(normalizePath);
  if (normalized.some(path => !classifyPath(path))) {
    return {
      plan: createCheckImpactPlan({ changedPaths: collection.paths }),
      selectorFailure: '',
    };
  }
  const sourcePaths = normalized.filter(
    path => classifyPath(path) === 'source'
  );
  /** @type {string[]} */
  let relatedTestPaths = [];
  let relatedTestsResolved = sourcePaths.length === 0;
  let selectorFailure = '';
  if (sourcePaths.length > 0) {
    const selector = runJestCommand(
      permission,
      deps,
      ['--runInBand', '--listTests', '--findRelatedTests', ...sourcePaths],
      SELECTOR_TIMEOUT_MS
    );
    relatedTestsResolved = !selector.error && selector.status === 0;
    if (relatedTestsResolved) {
      relatedTestPaths = (selector.stdout ?? '')
        .split(/\r?\n/)
        .filter(Boolean)
        .map(value => {
          const relativePath = deps.pathModule.isAbsolute(value)
            ? deps.pathModule.relative(deps.rootDir, value)
            : value;
          return relativePath.split(deps.pathModule.sep).join('/');
        });
    } else {
      selectorFailure =
        selector.error?.message ??
        `Jest related-test discovery exited with status ${selector.status}.`;
    }
  }

  return {
    plan: createCheckImpactPlan({
      changedPaths: collection.paths,
      relatedTestPaths,
      relatedTestsResolved,
    }),
    selectorFailure,
  };
}

/**
 * Parse explicit paths and optional base-ref arguments.
 * @param {string[]} argv Input arguments.
 * @param {string | undefined} defaultBaseRef Default comparison base.
 * @returns {{paths: string[] | null, baseRef: string | undefined, error: string}} Parsed inputs.
 */
function parseImpactArguments(argv, defaultBaseRef) {
  /** @type {string[]} */
  const paths = [];
  let hasExplicitPaths = false;
  let baseRef = defaultBaseRef;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--files') {
      hasExplicitPaths = true;
      while (index + 1 < argv.length && !argv[index + 1].startsWith('--')) {
        paths.push(argv[index + 1]);
        index += 1;
      }
      if (paths.length === 0)
        return {
          paths: null,
          baseRef,
          error: 'Provide one or more paths after --files.',
        };
      continue;
    }
    if (argv[index] === '--base') {
      if (!argv[index + 1] || argv[index + 1].startsWith('--'))
        return {
          paths: null,
          baseRef,
          error: 'Provide a Git ref after --base.',
        };
      baseRef = argv[index + 1];
      index += 1;
      continue;
    }
    return {
      paths: null,
      baseRef,
      error: `Unsupported impact option: ${argv[index]}.`,
    };
  }
  if (hasExplicitPaths && baseRef)
    return {
      paths: null,
      baseRef,
      error: 'Choose explicit --files or Git status/base discovery, not both.',
    };
  return { paths: hasExplicitPaths ? paths : null, baseRef, error: '' };
}

/**
 * Collect unstaged, staged, untracked, and optional base-branch paths.
 * @param {AllowEffects} permission Permission for Git effects.
 * @param {CheckImpactDependencies} deps CLI effects.
 * @param {{paths: string[] | null, baseRef?: string}} input Parsed input.
 * @returns {{paths: string[], error: string}} Changed paths or collection failure.
 */
function collectChangedPaths(permission, deps, input) {
  if (input.paths) return { paths: input.paths, error: '' };
  /** @type {string[]} */
  const paths = [];
  const calls = [
    ['diff', '--name-only', '-z', '--no-renames'],
    ['diff', '--cached', '--name-only', '-z', '--no-renames'],
    ['ls-files', '--others', '--exclude-standard', '-z'],
  ];
  for (const args of calls) {
    const result = deps.runCommand(
      permission,
      'git',
      args,
      commandOptions(deps.rootDir, SELECTOR_TIMEOUT_MS)
    );
    if (result.error || result.status !== 0)
      return {
        paths,
        error: 'Git could not inspect staged, unstaged, or untracked changes.',
      };
    paths.push(...splitGitPaths(result.stdout ?? ''));
  }

  if (input.baseRef) {
    if (input.baseRef.startsWith('-'))
      return { paths, error: 'The selected Git base ref is unsafe.' };
    const resolvedBase = deps.runCommand(
      permission,
      'git',
      [
        'rev-parse',
        '--verify',
        '--quiet',
        '--end-of-options',
        `${input.baseRef}^{commit}`,
      ],
      commandOptions(deps.rootDir, SELECTOR_TIMEOUT_MS)
    );
    if (
      resolvedBase.error ||
      resolvedBase.status !== 0 ||
      !resolvedBase.stdout?.trim()
    )
      return { paths, error: 'Git could not resolve the selected base ref.' };
    const baseDiff = deps.runCommand(
      permission,
      'git',
      [
        'diff',
        '--name-only',
        '-z',
        '--no-renames',
        `${resolvedBase.stdout.trim()}...HEAD`,
        '--',
      ],
      commandOptions(deps.rootDir, SELECTOR_TIMEOUT_MS)
    );
    if (baseDiff.error || baseDiff.status !== 0)
      return {
        paths,
        error: 'Git could not compare changes with the selected base ref.',
      };
    paths.push(...splitGitPaths(baseDiff.stdout ?? ''));
  }
  return { paths: [...new Set(paths)], error: '' };
}

/**
 * Split Git's NUL-delimited path output without corrupting spaces or newlines.
 * @param {string} output Git command output.
 * @returns {string[]} Paths.
 */
function splitGitPaths(output) {
  return output.split('\0').filter(Boolean);
}

/**
 * Build bounded process options for Git and Jest discovery/execution.
 * @param {string} rootDir Working directory.
 * @param {number} timeoutMs Process timeout.
 * @param {boolean} [streamOutput] Whether to inherit child output streams.
 * @returns {import('node:child_process').SpawnSyncOptionsWithStringEncoding} Child process options.
 */
function commandOptions(rootDir, timeoutMs, streamOutput = false) {
  /** @type {import('node:child_process').SpawnSyncOptionsWithStringEncoding} */
  const options = {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  };
  if (streamOutput) options.stdio = 'inherit';
  return options;
}
