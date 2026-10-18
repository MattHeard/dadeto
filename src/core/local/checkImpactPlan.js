/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/allow-effects').StartupAllowEffectsBoundary} StartupAllowEffectsBoundary */

const SOURCE_ROOTS = ['src/browser/', 'src/cloud/', 'src/core/', 'src/local/'];
const SELECTOR_TIMEOUT_MS = 45_000;

/**
 * Normalize a repository-relative path for stable impact plans.
 * @param {string} value Path to normalize.
 * @returns {string} Normalized path or an empty string when unsafe.
 */
function normalizePath(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  const path = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (path.startsWith('/') || path.split('/').includes('..')) return '';
  return path;
}

/**
 * Classify a changed path as supported source or unit-test input.
 * @param {string} path Normalized repository-relative path.
 * @returns {'source' | 'test' | ''} Path kind.
 */
function classifyPath(path) {
  if (SOURCE_ROOTS.some(root => path.startsWith(root)) && path.endsWith('.js'))
    return 'source';
  if (
    path.startsWith('test/') &&
    path.endsWith('.test.js') &&
    !path.startsWith('test/e2e/')
  )
    return 'test';
  return '';
}

/**
 * Quote one path for the displayed POSIX shell command.
 * @param {string} value Path to quote.
 * @returns {string} Single-quoted shell token.
 */
function quotePath(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/**
 * Build a deterministic diagnostic test plan from changed paths and Jest's related-test result.
 * @param {{ changedPaths?: string[], relatedTestPaths?: string[], relatedTestsResolved?: boolean }} options Plan inputs.
 * @returns {{ mode: string, changedPaths: string[], tests: string[], staticGates?: string[], commands: string[], reason?: string, authoritative: string }} Impact plan.
 */
export function createCheckImpactPlan({
  changedPaths = [],
  relatedTestPaths = [],
  relatedTestsResolved = false,
} = {}) {
  const changed = [...new Set(changedPaths.map(normalizePath))].sort();
  const unsupported = changed.find(path => !path || !classifyPath(path));
  const hasUnsupportedPath = changed.some(path => !path || !classifyPath(path));
  const sourceChanges = changed.filter(path => classifyPath(path) === 'source');
  const directTests = changed.filter(path => classifyPath(path) === 'test');
  const related = [...new Set(relatedTestPaths.map(normalizePath))]
    .filter(path => classifyPath(path) === 'test')
    .sort();

  let reason = '';
  if (changed.length === 0) reason = 'No changed paths were provided.';
  else if (hasUnsupportedPath)
    reason = `Unsupported or unsafe changed path: ${unsupported || '(empty)'}.`;
  else if (sourceChanges.length > 0 && !relatedTestsResolved)
    reason = 'Jest related-test discovery did not complete successfully.';
  else if (sourceChanges.length > 0 && related.length === 0)
    reason = 'Jest did not identify related unit tests for changed source.';

  if (reason) {
    return {
      mode: 'full-check',
      changedPaths: changed,
      tests: [],
      commands: ['npm run check'],
      reason,
      authoritative: 'npm run check',
    };
  }

  const tests = [...new Set([...directTests, ...related])].sort();
  const lintPaths = [...new Set([...changed, ...tests])].sort();
  const staticGates = ['eslint'];
  const commands = [
    `npx eslint --no-cache --max-warnings=0 ${lintPaths.map(quotePath).join(' ')}`,
    `node scripts/run-jest.js --runInBand --runTestsByPath ${tests.map(quotePath).join(' ')}`,
  ];
  if (sourceChanges.some(path => path.startsWith('src/core/'))) {
    staticGates.push('core-parse');
    commands.push('npm run core-parse');
  }
  commands.push('npm run check');
  return {
    mode: 'diagnostic',
    changedPaths: changed,
    tests,
    staticGates,
    commands,
    authoritative: 'npm run check',
  };
}

/**
 * @typedef {object} CheckImpactDependencies
 * @property {string[]} argv Command-line arguments.
 * @property {string} rootDir Repository root.
 * @property {string} processExecPath Node executable path.
 * @property {typeof import('node:path')} pathModule Path utilities.
 * @property {StartupAllowEffectsBoundary} bindStartupEffectBoundary Permission boundary for synchronous process and output effects.
 * @property {(permission: AllowEffects, command: string, args: string[], options: object) => {status: number | null, stdout?: string, error?: Error}} runCommand Permission-aware child-process runner.
 * @property {(permission: AllowEffects, output: string) => unknown} writeOutput Permission-aware CLI output writer.
 */

/**
 * Create the executable planner handle; process and output effects require a fresh permission.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {() => {exitCode: number}} Synchronous CLI handle.
 */
export function createPlanCheckImpactHandle(deps) {
  return () =>
    deps.bindStartupEffectBoundary(permission => runPlan(permission, deps));
}

/**
 * Resolve input, discover related tests, and print the resulting impact plan.
 * @param {AllowEffects} permission Permission for process and output effects.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {{exitCode: number}} Successful planner result.
 */
function runPlan(permission, deps) {
  const { paths, error } = resolveChangedPaths(permission, deps);
  /** @type {string[]} */
  let relatedTestPaths = [];
  let relatedTestsResolved = true;
  const sourcePaths = paths.filter(value =>
    /^\.?\/?src\/(browser|cloud|core|local)\/.*\.js$/.test(value)
  );
  if (!error && sourcePaths.length > 0) {
    const selector = deps.runCommand(
      permission,
      deps.processExecPath,
      [
        deps.pathModule.join(deps.rootDir, 'scripts/run-jest.js'),
        '--runInBand',
        '--listTests',
        '--findRelatedTests',
        ...sourcePaths,
      ],
      commandOptions(deps.rootDir)
    );
    relatedTestsResolved = !selector.error && selector.status === 0;
    if (relatedTestsResolved)
      relatedTestPaths = (selector.stdout ?? '')
        .split(/\r?\n/)
        .filter(Boolean)
        .map(value => {
          const relativePath = deps.pathModule.isAbsolute(value)
            ? deps.pathModule.relative(deps.rootDir, value)
            : value;
          return relativePath.split(deps.pathModule.sep).join('/');
        });
  }
  const plan = createCheckImpactPlan({
    changedPaths: error ? [] : paths,
    relatedTestPaths,
    relatedTestsResolved,
  });
  if (error) {
    plan.mode = 'full-check';
    plan.reason = error;
    plan.tests = [];
    plan.commands = ['npm run check'];
  }
  deps.writeOutput(permission, `${JSON.stringify(plan, null, 2)}\n`);
  return { exitCode: 0 };
}

/**
 * Resolve explicit paths or a Git diff range.
 * @param {AllowEffects} permission Permission for Git effects.
 * @param {CheckImpactDependencies} deps CLI and effect dependencies.
 * @returns {{paths: string[], error: string}} Changed paths and any input error.
 */
function resolveChangedPaths(permission, deps) {
  const { argv } = deps;
  const filesIndex = argv.indexOf('--files');
  const baseIndex = argv.indexOf('--base');
  if (filesIndex >= 0) {
    if (filesIndex !== 0 || baseIndex >= 0)
      return { paths: [], error: 'Choose --files or --base, not both.' };
    const paths = argv.slice(filesIndex + 1);
    if (paths.length === 0 || paths.some(value => value.startsWith('--')))
      return { paths: [], error: 'Provide one or more paths after --files.' };
    return { paths, error: '' };
  }
  if (baseIndex < 0 || !argv[baseIndex + 1])
    return {
      paths: [],
      error: 'Provide --files <paths...> or --base <git-ref>.',
    };
  if (
    baseIndex !== 0 ||
    ![2, 4].includes(argv.length) ||
    (argv.length === 4 && argv[2] !== '--head')
  )
    return {
      paths: [],
      error: 'Use --base <git-ref> with an optional --head <git-ref>.',
    };
  const headIndex = argv.indexOf('--head');
  const head = headIndex < 0 ? 'HEAD' : argv[headIndex + 1];
  if (!head) return { paths: [], error: 'The --head option needs a git ref.' };
  const result = deps.runCommand(
    permission,
    'git',
    ['diff', '--name-only', `${argv[baseIndex + 1]}...${head}`],
    commandOptions(deps.rootDir)
  );
  if (result.error || result.status !== 0)
    return {
      paths: [],
      error: 'Git could not resolve the requested diff range.',
    };
  return {
    paths: (result.stdout ?? '').split(/\r?\n/).filter(Boolean),
    error: '',
  };
}

/**
 * Build bounded child process options shared by Git and Jest discovery.
 * @param {string} rootDir Working directory.
 * @returns {object} Child process options.
 */
function commandOptions(rootDir) {
  return {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: SELECTOR_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
  };
}
