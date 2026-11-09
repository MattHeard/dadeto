import { mergeCoverageRecords } from '../../logic/core/local/coverage-records.js';
import {
  JEST_RUNNER,
  quotePath,
  commandOptions,
} from '../../logic/core/local/impact-commands.js';
import { parseImpactArguments } from '../../logic/boundary/local/impact-arguments.js';
import { isLogicJavaScriptPath } from '../../logic/core/local/logic-source-paths.js';
import { parseGitChanges } from '../../logic/boundary/local/git-changes.js';
import { parseMissedCoverage } from '../../logic/boundary/local/missed-coverage.js';
import {
  normalizeImpactPath as normalizePath,
  classifyImpactPath as classifyPath,
  parseRelatedImpactPaths,
} from '../../logic/boundary/local/impact-paths.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/allow-effects').StartupAllowEffectsBoundary} StartupAllowEffectsBoundary */
/** @typedef {import('../../logic/core/local/coverage-records.js').IstanbulCoverageRecord} IstanbulCoverageRecord */
/** @typedef {Record<string, IstanbulCoverageRecord>} IstanbulCoverageMap */
/** @typedef {{status: number | null, stdout?: string, stderr?: string, error?: Error, coverage?: IstanbulCoverageMap, command?: string, coverageError?: string}} ScopedCoverageRun */

const SELECTOR_TIMEOUT_MS = 45_000;

/** @typedef {{changedPaths: string[], tests: string[], testSelection: 'none' | 'related' | 'direct' | 'all-unit', staticGates: string[], commands: string[], authoritative: string}} CheckImpactPlanBase */
/** @typedef {CheckImpactPlanBase & {mode: 'none' | 'fallback', reason: string}} FallbackCheckImpactPlan */
/** @typedef {CheckImpactPlanBase & {mode: 'selected', reason?: undefined}} SelectedCheckImpactPlan */
/** @typedef {FallbackCheckImpactPlan | SelectedCheckImpactPlan} CheckImpactPlan */

/**
 * Build a deterministic plan for affected or fallback unit tests.
 * @param {{ changedPaths?: unknown[], relatedTestPaths?: unknown[], relatedTestsResolved?: boolean, collectionError?: string }} options Plan inputs.
 * @returns {CheckImpactPlan} Impact plan.
 */
export function createCheckImpactPlan({
  changedPaths = [],
  relatedTestPaths,
  relatedTestsResolved = false,
  collectionError = '',
} = {}) {
  const changed = [...new Set(changedPaths.map(normalizePath))].sort();
  const invalid = changed.find(path => !classifyPath(path));
  const sourceChanges = changed.filter(path => classifyPath(path) === 'source');
  const directTests = changed.filter(path => classifyPath(path) === 'test');
  const parsedRelated = parseRelatedImpactPaths(relatedTestPaths);
  if (!parsedRelated.ok) throw parsedRelated.error;
  const related = parsedRelated.paths;
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
  if (!reason && invalid !== undefined)
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
  const {
    plan,
    selectorFailure,
    deletedPaths = [],
  } = preparePlan(permission, deps);
  let testsFailed = false;
  let selectedTests = plan.tests;
  let fallbackFailure = '';
  const scopedSourceFiles =
    includeStaticGates && plan.mode === 'selected'
      ? plan.changedPaths.filter(isLogicJavaScriptPath)
      : [];
  /** @type {ReturnType<typeof createScopedCoverageReport> | undefined} */
  let scopedCoverage;
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
      testsFailed = true;
      fallbackFailure ||= 'Jest did not identify unit test files to execute.';
    } else {
      const runs = runImpactShards(
        permission,
        deps,
        selectedTests,
        scopedSourceFiles
      );
      testsFailed = runs.some(run => !run.passed);
      if (scopedSourceFiles.length > 0)
        scopedCoverage = createScopedCoverageReport(
          scopedSourceFiles,
          runs.map(run => run.execution),
          deps
        );
    }
  }

  const failed =
    testsFailed ||
    staticChecks?.some(check => check.result === 'failed') ||
    (scopedCoverage &&
      (scopedCoverage.errors.length > 0 ||
        scopedCoverage.files.some(
          file =>
            !file.collected ||
            file.uncoveredLines.length > 0 ||
            file.uncoveredBranches.length > 0
        )));
  const exitCode = failed ? 1 : 0;
  const status = failed
    ? 'failed'
    : plan.mode === 'none'
      ? 'skipped'
      : 'passed';
  const report = {
    changedPaths: plan.changedPaths,
    ...(deletedPaths.length > 0 ? { deletedPaths } : {}),
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
 * Execute each bounded shard once and retain its real result and assessed status.
 * @param {AllowEffects} permission Process/output permission.
 * @param {CheckImpactDependencies} deps Process/output dependencies.
 * @param {string[]} tests Selected test paths.
 * @param {string[]} sourceFiles Explicit scoped source paths, empty for test-only runs.
 * @returns {Array<{passed: boolean, execution: ScopedCoverageRun}>} Actual outcomes in execution order.
 */
function runImpactShards(permission, deps, tests, sourceFiles) {
  const shards = partitionTests(tests, resolveImpactShardSize(deps));
  return shards.map((shard, index) => {
    deps.writeOutput(
      permission,
      `Impact tests: starting shard ${index + 1}/${shards.length} (${shard.length} test files).\n`
    );
    const execution =
      sourceFiles.length > 0
        ? deps.runCoverage(permission, shard, sourceFiles)
        : runTestShard(permission, deps, shard);
    if (execution.stdout) deps.writeOutput(permission, execution.stdout);
    if (execution.stderr) deps.writeOutput(permission, execution.stderr);
    const passed = !execution.error && execution.status === 0;
    deps.writeOutput(
      permission,
      `Impact tests: shard ${index + 1}/${shards.length} ${passed ? 'passed' : 'failed'}.\n`
    );
    return { passed, execution };
  });
}

/**
 * Summarize only the changed core files reported by scoped Jest coverage.
 * @param {string[]} sourceFiles Changed core source paths.
 * @param {ScopedCoverageRun[]} coverageRuns Coverage shard results.
 * @param {CheckImpactDependencies} deps Path dependencies.
 * @returns {{scope: string, files: Array<{file: string, collected: boolean, uncoveredLines: number[], uncoveredBranches: Array<{line: number, arm: number}>}>, commands: string[], errors: string[], authoritative: string}} Scoped coverage evidence.
 */
function createScopedCoverageReport(sourceFiles, coverageRuns, deps) {
  const errors = coverageRuns.flatMap(run =>
    run.coverageError ? [run.coverageError] : []
  );
  const entries = coverageRuns.flatMap(run =>
    Object.entries(run.coverage ?? {}).map(([filePath, record]) => {
      const relativePath = deps.pathModule.isAbsolute(filePath)
        ? deps.pathModule.relative(deps.rootDir, filePath)
        : filePath;
      const normalizedPath = normalizePath(
        relativePath.split(deps.pathModule.sep).join('/')
      );
      return { file: normalizedPath, record };
    })
  );

  const files = sourceFiles.map(file => {
    const record = mergeCoverageRecords(
      entries.filter(entry => entry.file === file).map(entry => entry.record)
    );
    const parsed = parseMissedCoverage(record);
    if (!parsed.ok) throw parsed.error;
    return { file, ...parsed.evidence };
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
  const candidates =
    result.stdout
      ?.split('\0')
      .map(candidate => toUnitTestPath(candidate, deps))
      .filter(Boolean) ?? [];
  return {
    tests: [...new Set(candidates)]
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
 * @returns {{plan: ReturnType<typeof createCheckImpactPlan>, selectorFailure: string, deletedPaths?: string[]}} Prepared test plan.
 */
function preparePlan(permission, deps) {
  const parsed = parseImpactArguments(deps.argv, deps.defaultBaseRef);
  if (!parsed.ok) throw parsed.error;
  const input = parsed.input;
  if (input.error)
    return {
      plan: createCheckImpactPlan({ collectionError: input.error }),
      selectorFailure: '',
    };

  const collection = collectChangedPaths(permission, deps, input);
  if (collection.error)
    return createCollectionFallback(collection, collection.error);

  if (collection.deletedPaths?.some(file => classifyPath(file) === 'source'))
    return createCollectionFallback(
      collection,
      'Deleted source paths require conservative unit-test selection.'
    );

  const normalized = collection.paths.map(normalizePath);
  const sourcePaths = normalized.filter(
    path => classifyPath(path) === 'source'
  );
  if (normalized.some(path => !classifyPath(path)) || sourcePaths.length === 0)
    return {
      plan: createCheckImpactPlan({ changedPaths: collection.paths }),
      selectorFailure: '',
    };

  const selector = runJestCommand(
    permission,
    deps,
    ['--runInBand', '--listTests', '--findRelatedTests', ...sourcePaths],
    SELECTOR_TIMEOUT_MS
  );
  const relatedTestsResolved = !selector.error && selector.status === 0;
  const relatedTestPaths = relatedTestsResolved
    ? selector.stdout?.split(/\r?\n/).map(value => {
        const relativePath = deps.pathModule.isAbsolute(value)
          ? deps.pathModule.relative(deps.rootDir, value)
          : value;
        return relativePath.split(deps.pathModule.sep).join('/');
      })
    : undefined;
  const selectorFailure = relatedTestsResolved
    ? ''
    : (selector.error?.message ??
      `Jest related-test discovery exited with status ${selector.status}.`);

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
 * Preserve collected paths when reliable selection is unavailable.
 * @param {{paths: string[], deletedPaths?: string[]}} collection Collected evidence.
 * @param {string} reason Conservative fallback reason.
 * @returns {{plan: CheckImpactPlan, selectorFailure: string, deletedPaths?: string[]}} Fallback selection.
 */
function createCollectionFallback(collection, reason) {
  return {
    plan: createCheckImpactPlan({
      changedPaths: collection.paths,
      collectionError: reason,
    }),
    selectorFailure: '',
    deletedPaths: collection.deletedPaths,
  };
}

/**
 * Collect unstaged, staged, untracked, and optional base-branch paths.
 * @param {AllowEffects} permission Permission for Git effects.
 * @param {CheckImpactDependencies} deps CLI effects.
 * @param {{paths: string[] | null, baseRef?: string}} input Parsed input.
 * @returns {{paths: string[], deletedPaths?: string[], error: string}} Changed paths or collection failure; deletion metadata exists only when collected from Git.
 */
function collectChangedPaths(permission, deps, input) {
  if (input.paths) return { paths: input.paths, error: '' };
  /** @type {string[]} */
  const paths = [];
  const deletionCandidates = [];
  const calls = [
    ['diff', '--name-status', '-z', '--no-renames'],
    ['diff', '--cached', '--name-status', '-z', '--no-renames'],
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
      return failedChangeCollection(
        paths,
        'Git could not inspect staged, unstaged, or untracked changes.'
      );
    if (args[0] === 'ls-files')
      paths.push(...splitGitPaths(result.stdout ?? ''));
    else {
      const changes = parseGitChanges(result.stdout ?? '');
      if (!changes.ok)
        return failedChangeCollection(
          paths,
          'Git returned malformed change status evidence.'
        );
      paths.push(...changes.paths);
      deletionCandidates.push(...changes.deletedPaths);
    }
  }

  if (input.baseRef) {
    if (input.baseRef.startsWith('-'))
      return failedChangeCollection(
        paths,
        'The selected Git base ref is unsafe.'
      );
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
      return failedChangeCollection(
        paths,
        'Git could not resolve the selected base ref.'
      );
    const baseDiff = deps.runCommand(
      permission,
      'git',
      [
        'diff',
        '--name-status',
        '-z',
        '--no-renames',
        `${resolvedBase.stdout.trim()}...HEAD`,
        '--',
      ],
      commandOptions(deps.rootDir, SELECTOR_TIMEOUT_MS)
    );
    if (baseDiff.error || baseDiff.status !== 0)
      return failedChangeCollection(
        paths,
        'Git could not compare changes with the selected base ref.'
      );
    const changes = parseGitChanges(baseDiff.stdout ?? '');
    if (!changes.ok)
      return failedChangeCollection(
        paths,
        'Git returned malformed base change status evidence.'
      );
    paths.push(...changes.paths);
    deletionCandidates.push(...changes.deletedPaths);
  }
  const deletedPaths = [...new Set(deletionCandidates)].filter(file =>
    deps.fileExists
      ? !deps.fileExists(deps.pathModule.resolve(deps.rootDir, file))
      : false
  );
  return { paths: [...new Set(paths)], deletedPaths, error: '' };
}

/**
 * Reject partial deletion evidence while retaining paths for conservative tests.
 * @param {string[]} paths Paths collected before failure.
 * @param {string} error Collection failure reason.
 * @returns {{paths: string[], error: string}} Failed collection without reliable deletion evidence.
 */
function failedChangeCollection(paths, error) {
  return { paths, error };
}

/**
 * Split Git's NUL-delimited path output without corrupting spaces or newlines.
 * @param {string} output Git command output.
 * @returns {string[]} Paths.
 */
function splitGitPaths(output) {
  return output.split('\0').filter(Boolean);
}
