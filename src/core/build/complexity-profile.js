const PARSER_OPTIONS = {
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: [
    'jsx',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'decorators-legacy',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'nullishCoalescingOperator',
    'optionalChaining',
    'topLevelAwait',
  ],
  sourceType: 'unambiguous',
};

/**
 *
 * @param lineRange
 */
function normalizeLineRange(lineRange) {
  if (!lineRange) {
    return null;
  }

  const start = Number.parseInt(lineRange.start, 10);
  const end = Number.parseInt(lineRange.end, 10);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < start
  ) {
    throw new Error(`Invalid line range: ${lineRange.start}:${lineRange.end}`);
  }

  return { start, end };
}

/**
 *
 * @param method
 * @param lineRange
 */
function isMethodWithinRange(method, lineRange) {
  if (!lineRange) {
    return true;
  }

  return method.lineStart <= lineRange.end && method.lineEnd >= lineRange.start;
}

/**
 *
 * @param method
 * @param threshold
 */
function toMethodProfile(method, threshold) {
  const excess = Math.max(method.cyclomatic - threshold, 0);

  return {
    name: method.name,
    lineStart: method.lineStart,
    lineEnd: method.lineEnd,
    cyclomatic: method.cyclomatic,
    excess,
  };
}

/**
 *
 * @param analyzer
 */
function createBuildComplexityProfile(analyzer) {
  return function buildComplexityProfile(source, options = {}) {
    if (typeof source !== 'string') {
      throw new TypeError('source must be a string');
    }

    const threshold = options.threshold ?? 2;
    const lineRange = normalizeLineRange(options.lineRange);
    const report = analyzer.analyzeModule(source, {}, PARSER_OPTIONS);
    const methods = report.methods
      .filter(method => isMethodWithinRange(method, lineRange))
      .map(method => toMethodProfile(method, threshold))
      .sort((left, right) => {
        if (right.excess !== left.excess) {
          return right.excess - left.excess;
        }

        if (right.cyclomatic !== left.cyclomatic) {
          return right.cyclomatic - left.cyclomatic;
        }

        return left.lineStart - right.lineStart;
      });

    return {
      threshold,
      lineRange,
      methods,
      summary: {
        methodCount: methods.length,
        warningCount: methods.filter(method => method.excess > 0).length,
        peakCyclomatic: methods.reduce(
          (peak, method) => Math.max(peak, method.cyclomatic),
          0
        ),
        totalExcess: methods.reduce(
          (total, method) => total + method.excess,
          0
        ),
      },
    };
  };
}

/**
 *
 * @param baseline
 * @param current
 * @param key
 */
function summarizeDelta(baseline, current, key) {
  return current.summary[key] - baseline.summary[key];
}

/**
 *
 * @param delta
 */
function classifyChange(delta) {
  if (delta < 0) {
    return 'improved';
  }

  if (delta > 0) {
    return 'worse';
  }

  return 'unchanged';
}

/**
 *
 * @param baseline
 * @param current
 */
export function compareComplexityProfiles(baseline, current) {
  const warningDelta = summarizeDelta(baseline, current, 'warningCount');
  const peakDelta = summarizeDelta(baseline, current, 'peakCyclomatic');
  const excessDelta = summarizeDelta(baseline, current, 'totalExcess');

  return {
    baseline: baseline.summary,
    current: current.summary,
    delta: {
      warningCount: warningDelta,
      peakCyclomatic: peakDelta,
      totalExcess: excessDelta,
    },
    assessment: {
      warningCount: classifyChange(warningDelta),
      peakCyclomatic: classifyChange(peakDelta),
      totalExcess: classifyChange(excessDelta),
    },
  };
}

/**
 *
 * @param argv
 */
function parseArgs(argv) {
  const options = {
    threshold: 2,
    lineRange: null,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--threshold') {
      options.threshold = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--lines') {
      const [start, end] = String(argv[index + 1] ?? '').split(':');
      options.lineRange = { start, end };
      index += 1;
      continue;
    }

    positional.push(arg);
  }

  if (positional.length !== 2) {
    throw new Error(
      'Usage: node src/build/complexity-profile.js [--threshold N] [--lines start:end] <baseline-file> <current-file>'
    );
  }

  if (!Number.isInteger(options.threshold) || options.threshold < 1) {
    throw new Error(`Invalid threshold: ${String(options.threshold)}`);
  }

  return {
    baselinePath: positional[0],
    currentPath: positional[1],
    options,
  };
}

/**
 *
 * @param root0
 * @param root0.buildComplexityProfile
 * @param root0.readSource
 * @param root0.stdout
 * @param root0.argv
 */
function createRunFromCli({
  buildComplexityProfile,
  readSource,
  stdout,
  argv,
}) {
  return function runFromCli() {
    const { baselinePath, currentPath, options } = parseArgs(argv.slice(2));
    const baselineProfile = buildComplexityProfile(
      readSource(baselinePath),
      options
    );
    const currentProfile = buildComplexityProfile(
      readSource(currentPath),
      options
    );
    const comparison = compareComplexityProfiles(
      baselineProfile,
      currentProfile
    );

    stdout.write(
      `${JSON.stringify(
        {
          baselinePath,
          currentPath,
          profileOptions: {
            threshold: baselineProfile.threshold,
            lineRange: baselineProfile.lineRange,
          },
          comparison,
          baselineMethods: baselineProfile.methods,
          currentMethods: currentProfile.methods,
        },
        null,
        2
      )}\n`
    );
  };
}

/**
 * Build the complexity-profile adapter handle.
 * @param {{
 *   analyzer: { analyzeModule: Function },
 *   readSource: (filePath: string) => string,
 *   stdout: { write: (output: string) => void },
 *   argv: string[],
 * }} deps Runtime dependencies.
 * @returns {{
 *   buildComplexityProfile: (source: string, options?: object) => object,
 *   compareComplexityProfiles: typeof compareComplexityProfiles,
 *   runFromCli: () => void,
 * }} Complexity-profile handle.
 */
export function createComplexityProfileHandle(deps) {
  const buildComplexityProfile = createBuildComplexityProfile(deps.analyzer);
  return {
    buildComplexityProfile,
    compareComplexityProfiles,
    runFromCli: createRunFromCli({
      buildComplexityProfile,
      readSource: deps.readSource,
      stdout: deps.stdout,
      argv: deps.argv,
    }),
  };
}
