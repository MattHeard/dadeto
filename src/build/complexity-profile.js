import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import escomplex from "typhonjs-escomplex";

const PARSER_OPTIONS = {
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: [
    "jsx",
    "classProperties",
    "classPrivateProperties",
    "classPrivateMethods",
    "decorators-legacy",
    "dynamicImport",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "nullishCoalescingOperator",
    "optionalChaining",
    "topLevelAwait"
  ],
  sourceType: "unambiguous"
};

function normalizeLineRange(lineRange) {
  if (!lineRange) {
    return null;
  }

  const start = Number.parseInt(lineRange.start, 10);
  const end = Number.parseInt(lineRange.end, 10);

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error(`Invalid line range: ${lineRange.start}:${lineRange.end}`);
  }

  return { start, end };
}

function isMethodWithinRange(method, lineRange) {
  if (!lineRange) {
    return true;
  }

  return method.lineStart <= lineRange.end && method.lineEnd >= lineRange.start;
}

function toMethodProfile(method, threshold) {
  const excess = Math.max(method.cyclomatic - threshold, 0);

  return {
    name: method.name,
    lineStart: method.lineStart,
    lineEnd: method.lineEnd,
    cyclomatic: method.cyclomatic,
    excess
  };
}

export function buildComplexityProfile(source, options = {}) {
  if (typeof source !== "string") {
    throw new TypeError("source must be a string");
  }

  const threshold = options.threshold ?? 2;
  const lineRange = normalizeLineRange(options.lineRange);
  const report = escomplex.analyzeModule(source, {}, PARSER_OPTIONS);
  const methods = report.methods
    .filter((method) => isMethodWithinRange(method, lineRange))
    .map((method) => toMethodProfile(method, threshold))
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
      warningCount: methods.filter((method) => method.excess > 0).length,
      peakCyclomatic:
        methods.reduce(
          (peak, method) => Math.max(peak, method.cyclomatic),
          0
        ),
      totalExcess: methods.reduce((total, method) => total + method.excess, 0)
    }
  };
}

function summarizeDelta(baseline, current, key) {
  return current.summary[key] - baseline.summary[key];
}

function classifyChange(delta) {
  if (delta < 0) {
    return "improved";
  }

  if (delta > 0) {
    return "worse";
  }

  return "unchanged";
}

export function compareComplexityProfiles(baseline, current) {
  const warningDelta = summarizeDelta(baseline, current, "warningCount");
  const peakDelta = summarizeDelta(baseline, current, "peakCyclomatic");
  const excessDelta = summarizeDelta(baseline, current, "totalExcess");

  return {
    baseline: baseline.summary,
    current: current.summary,
    delta: {
      warningCount: warningDelta,
      peakCyclomatic: peakDelta,
      totalExcess: excessDelta
    },
    assessment: {
      warningCount: classifyChange(warningDelta),
      peakCyclomatic: classifyChange(peakDelta),
      totalExcess: classifyChange(excessDelta)
    }
  };
}

function parseArgs(argv) {
  const options = {
    threshold: 2,
    lineRange: null
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--threshold") {
      options.threshold = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === "--lines") {
      const [start, end] = String(argv[index + 1] ?? "").split(":");
      options.lineRange = { start, end };
      index += 1;
      continue;
    }

    positional.push(arg);
  }

  if (positional.length !== 2) {
    throw new Error(
      "Usage: node src/build/complexity-profile.js [--threshold N] [--lines start:end] <baseline-file> <current-file>"
    );
  }

  if (!Number.isInteger(options.threshold) || options.threshold < 1) {
    throw new Error(`Invalid threshold: ${String(options.threshold)}`);
  }

  return {
    baselinePath: positional[0],
    currentPath: positional[1],
    options
  };
}

function readSource(filePath) {
  return fs.readFileSync(path.resolve(filePath), "utf8");
}

const __filename = fileURLToPath(import.meta.url);

function runFromCli() {
  const { baselinePath, currentPath, options } = parseArgs(process.argv.slice(2));
  const baselineProfile = buildComplexityProfile(readSource(baselinePath), options);
  const currentProfile = buildComplexityProfile(readSource(currentPath), options);
  const comparison = compareComplexityProfiles(baselineProfile, currentProfile);

  process.stdout.write(
    `${JSON.stringify(
      {
        baselinePath,
        currentPath,
        profileOptions: {
          threshold: baselineProfile.threshold,
          lineRange: baselineProfile.lineRange
        },
        comparison,
        baselineMethods: baselineProfile.methods,
        currentMethods: currentProfile.methods
      },
      null,
      2
    )}\n`
  );
}

if (process.argv[1] === __filename) {
  try {
    runFromCli();
  } catch (error) {
    process.stderr.write(`Failed to compare complexity profiles: ${error.message}\n`);
    process.exit(1);
  }
}
