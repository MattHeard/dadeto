import { PARSER_OPTIONS } from './parser-options.js';

/**
 * @typedef {{ name: string, lineStart: number, lineEnd: number, cyclomatic: number }} ComplexityMethod
 * @typedef {{ name: string, lineStart: number, lineEnd: number, cyclomatic: number, excess: number }} MethodProfile
 * @typedef {{ start: number, end: number } | null} NormalizedLineRange
 */

/**
 * Normalize an optional CLI line range.
 * @param {{ start: string, end: string } | null | undefined} lineRange Candidate line range.
 * @returns {NormalizedLineRange} Parsed line range, or null when omitted.
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
 * Check whether a method overlaps the requested line range.
 * @param {ComplexityMethod} method Method metric.
 * @param {NormalizedLineRange} lineRange Optional filter range.
 * @returns {boolean} True when the method should be included.
 */
function isMethodWithinRange(method, lineRange) {
  if (!lineRange) {
    return true;
  }

  return method.lineStart <= lineRange.end && method.lineEnd >= lineRange.start;
}

/**
 * Convert analyzer method output into a compact profile row.
 * @param {ComplexityMethod} method Method metric.
 * @param {number} threshold Warning threshold.
 * @returns {MethodProfile} Method profile.
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
 * Create the complexity profile builder with an injected analyzer.
 * @param {{ analyzeModule: Function }} analyzer Complexity analyzer dependency.
 * @returns {(source: string, options?: { threshold?: number, lineRange?: { start: string, end: string } | null }) => object} Profile builder.
 */
function createBuildComplexityProfile(analyzer) {
  return function buildComplexityProfile(source, options = {}) {
    if (typeof source !== 'string') {
      throw new TypeError('source must be a string');
    }

    const threshold = options.threshold ?? 2;
    const lineRange = normalizeLineRange(options.lineRange);
    const report = analyzer.analyzeModule(source, {}, PARSER_OPTIONS);
    /** @type {ComplexityMethod[]} */
    const reportMethods = report.methods;
    const methods = reportMethods
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
 * Compute one summary delta.
 * @param {{ summary: Record<string, number> }} baseline Baseline profile.
 * @param {{ summary: Record<string, number> }} current Current profile.
 * @param {string} key Summary key.
 * @returns {number} Current value minus baseline value.
 */
function summarizeDelta(baseline, current, key) {
  return current.summary[key] - baseline.summary[key];
}

/**
 * Classify a numeric delta.
 * @param {number} delta Numeric delta.
 * @returns {'improved' | 'worse' | 'unchanged'} Direction label.
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
 * Compare two complexity profiles.
 * @param {{ summary: Record<string, number> }} baseline Baseline profile.
 * @param {{ summary: Record<string, number> }} current Current profile.
 * @returns {object} Summary comparison.
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
 * Parse complexity profile CLI arguments.
 * @param {string[]} argv CLI arguments after the node/script pair.
 * @returns {{ baselinePath: string, currentPath: string, options: { threshold: number, lineRange: { start: string | undefined, end: string | undefined } | null } }} Parsed arguments.
 */
function parseArgs(argv) {
  /** @type {{ threshold: number, lineRange: { start: string | undefined, end: string | undefined } | null }} */
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
 * Create the CLI runner.
 * @param {object} root0 Runtime dependencies.
 * @param {Function} root0.buildComplexityProfile Profile builder.
 * @param {(filePath: string) => string} root0.readSource Source reader.
 * @param {{ write: (output: string) => void }} root0.stdout Output stream.
 * @param {string[]} root0.argv Process arguments.
 * @returns {() => void} CLI runner.
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
