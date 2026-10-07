import { escapeHtml } from '../build/html.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * @typedef {{path: string, content: string, format: string}} ScanSource
 * @typedef {{statistics: Record<string, any>, duplicates: Array<Record<string, any>>}} CloneReport
 * @typedef {{
 *   readFile: (path: string) => string,
 *   readDirectory: (root: string) => Array<{parentPath: string, name: string, isFile: () => boolean, isSymbolicLink: () => boolean}>,
 *   fileSize: (path: string) => number,
 *   joinPath: (...parts: string[]) => string,
 *   parseSize: (size: string) => number,
 *   getDefaultOptions: () => Record<string, any>,
 *   resolveMode: (mode: string) => unknown,
 *   formatFor: (path: string, extensions: Record<string, string[]>) => string | undefined,
 *   createDetector: (options: Record<string, any>) => {detect: (path: string, content: string, format: string) => Promise<Array<Record<string, any>>>, on: (event: string, handler: (...args: any[]) => void) => unknown},
 *   createStatistics: () => {subscribe: () => Record<string, (...args: any[]) => void>, getStatistic: () => Record<string, any>},
 *   makeDirectory: (permission: AllowEffects, path: string) => void,
 *   writeFile: (permission: AllowEffects, path: string, content: string) => void,
 *   bindEffectBoundary: import('../../../types/allow-effects').AllowEffectsBoundary,
 * }} ScanDependencies
 */

const CONFIG_KEYS = new Set([
  'path',
  'mode',
  'minTokens',
  'reporters',
  'output',
]);

/**
 * Run the established detector without its vulnerable glob-based CLI finder.
 * @param {ScanDependencies} deps Original engine and filesystem adapters.
 * @param {string} configPath Repository configuration path.
 * @returns {() => Promise<CloneReport>} Strict scanner handler.
 */
export function createCloneScanHandle(deps, configPath) {
  return async () => {
    const options = readScanOptions(deps, configPath);
    const sources = collectScanSources(deps, options);
    const sourceByPath = new Map(sources.map(source => [source.path, source]));
    const statistics = deps.createStatistics();
    const detector = deps.createDetector(options);
    Object.entries(statistics.subscribe()).forEach(([event, handler]) => {
      detector.on(
        event,
        event === 'CLONE_FOUND'
          ? payload => {
              if (hasValidCloneRanges(payload.clone, sourceByPath)) {
                handler(payload);
              }
            }
          : handler
      );
    });
    const clones = [];
    for (const source of sources.toReversed()) {
      const detected = await detector.detect(
        source.path,
        source.content,
        source.format
      );
      clones.push(
        ...detected.filter(clone => hasValidCloneRanges(clone, sourceByPath))
      );
    }
    const report = {
      statistics: statistics.getStatistic(),
      duplicates: clones.map(clone => formatDetectedClone(clone, deps)),
    };
    await publishCloneReport(report, options.output, deps);
    return report;
  };
}

/**
 * Reject detector results whose source ranges are missing, reversed, or out of bounds.
 * @param {Record<string, any>} clone Detector clone.
 * @param {Map<string, ScanSource>} sourceByPath Scanned source lookup.
 * @returns {boolean} Whether both clone occurrences map to valid source ranges.
 */
function hasValidCloneRanges(clone, sourceByPath) {
  if (!clone?.duplicationA || !clone?.duplicationB) return false;
  return [clone.duplicationA, clone.duplicationB].every(side => {
    const source = sourceByPath.get(side.sourceId);
    const [start, end] = side.range ?? [];
    return (
      source !== undefined &&
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      start <= end &&
      end <= source.content.length &&
      Number.isInteger(side.start?.line) &&
      Number.isInteger(side.end?.line) &&
      side.start.line <= side.end.line &&
      Number.isInteger(side.start?.position) &&
      Number.isInteger(side.end?.position) &&
      side.start.position <= side.end.position
    );
  });
}

/**
 * Reject unsupported configuration rather than silently skipping its meaning.
 * @param {ScanDependencies} deps Configuration and mode adapters.
 * @param {string} configPath Configuration location.
 * @returns {Record<string, any>} Original detector options.
 */
function readScanOptions(deps, configPath) {
  const config = JSON.parse(deps.readFile(configPath));
  const unsupported = Object.keys(config).filter(key => !CONFIG_KEYS.has(key));
  if (unsupported.length) {
    throw new Error(
      `Unsupported clone scanner options: ${unsupported.join(', ')}`
    );
  }
  const options = { ...deps.getDefaultOptions(), ...config };
  options.mode = deps.resolveMode(options.mode);
  return options;
}

/**
 * Retain native breadth-first directory order and the original file limits.
 * @param {ScanDependencies} deps Filesystem adapters.
 * @param {Record<string, any>} options Original options.
 * @returns {ScanSource[]} Supported source files in original finder order.
 */
function collectScanSources(deps, options) {
  return /** @type {string[]} */ (options.path)
    .flatMap(root => deps.readDirectory(root))
    .map(requirePhysicalEntry)
    .filter(entry => entry.isFile())
    .map(entry => deps.joinPath(entry.parentPath, entry.name))
    .map(path => readScanSource(path, deps, options))
    .filter(source => source !== null);
}

/**
 * Fail explicitly for links rather than quietly omitting linked source trees.
 * @param {ReturnType<ScanDependencies['readDirectory']>[number]} entry Native entry.
 * @returns {ReturnType<ScanDependencies['readDirectory']>[number]} Physical entry.
 */
function requirePhysicalEntry(entry) {
  if (entry.isSymbolicLink()) {
    throw new Error(
      `Linked scan entry requires explicit enumeration: ${entry.name}`
    );
  }
  return entry;
}

/**
 * Resolve a supported, size-bounded source before reading its content.
 * @param {string} path Source path.
 * @param {ScanDependencies} deps Source adapters.
 * @param {Record<string, any>} options Original limits and formats.
 * @returns {ScanSource | null} Eligible source or absence.
 */
function readScanSource(path, deps, options) {
  const format = deps.formatFor(path, options.formatsExts);
  if (!format) return null;
  if (deps.fileSize(path) > deps.parseSize(options.maxSize)) return null;
  return boundedSource({ path, format, content: deps.readFile(path) }, options);
}

/**
 * Keep the established minimum and maximum source-line limits.
 * @param {ScanSource} source Source text and format.
 * @param {Record<string, any>} options Original line limits.
 * @returns {ScanSource | null} Bounded source or absence.
 */
function boundedSource(source, options) {
  const lines = source.content.split('\n').length;
  if (lines < options.minLines || lines > options.maxLines) return null;
  return source;
}

/**
 * Preserve the legacy JSON clone schema and exact source fragment.
 * @param {Record<string, any>} clone Original detector result.
 * @param {ScanDependencies} deps Source reader.
 * @returns {Record<string, any>} Report clone.
 */
function formatDetectedClone(clone, deps) {
  const first = clone.duplicationA;
  const duplicatedTokens = first.end.position - first.start.position;
  return {
    format: clone.format,
    lines: first.end.line - first.start.line + 1,
    fragment: readCloneSourceLines(first, deps.readFile(first.sourceId)),
    tokens: duplicatedTokens,
    firstFile: formatCloneLocation(first),
    secondFile: formatCloneLocation(clone.duplicationB),
  };
}

/**
 * Read the detector's one-based source-line span from the original file.
 * @param {Record<string, any>} side Detector occurrence.
 * @param {string} content Original source text.
 * @returns {string} Exact source lines represented by the clone.
 */
function readCloneSourceLines(side, content) {
  return content
    .split('\n')
    .slice(side.start.line - 1, side.end.line)
    .join('\n');
}

/**
 * Preserve locations used by existing report consumers.
 * @param {Record<string, any>} side One detector occurrence.
 * @returns {Record<string, any>} Source location in the established report schema.
 */
function formatCloneLocation(side) {
  return {
    name: side.sourceId,
    start: side.start.line,
    end: side.end.line,
    startLoc: side.start,
    endLoc: side.end,
  };
}

/**
 * Publish JSON and a standalone readable HTML report at the established paths.
 * @param {CloneReport} report Exact detection result.
 * @param {string} output Report directory.
 * @param {ScanDependencies} deps Output adapters.
 * @returns {Promise<void>} Completion after report publication.
 */
async function publishCloneReport(report, output, deps) {
  const htmlDirectory = deps.joinPath(output, 'html');
  const serialized = JSON.stringify(report, null, 2);
  const files = /** @type {Array<[string, string]>} */ ([
    [deps.joinPath(output, 'jscpd-report.json'), serialized],
    [deps.joinPath(htmlDirectory, 'jscpd-report.json'), serialized],
    [deps.joinPath(htmlDirectory, 'index.html'), renderCloneReport(report)],
  ]);
  await deps.bindEffectBoundary(permission =>
    writeCloneReport(permission, htmlDirectory, files, deps)
  );
}

/**
 * Perform report filesystem effects with the caller-owned permission.
 * @param {AllowEffects} permission Explicit report-write permission.
 * @param {string} htmlDirectory Report HTML directory.
 * @param {Array<[string, string]>} files Report paths and contents.
 * @param {ScanDependencies} deps Filesystem adapters.
 * @returns {Promise<void>} Completion after synchronous report writes.
 */
async function writeCloneReport(permission, htmlDirectory, files, deps) {
  deps.makeDirectory(permission, htmlDirectory);
  for (const [path, content] of files) {
    deps.writeFile(permission, path, content);
  }
}

/**
 * Escape source code and filenames when presenting clone evidence.
 * @param {CloneReport} report Detection evidence.
 * @returns {string} Self-contained HTML.
 */
function renderCloneReport(report) {
  const blocks = report.duplicates
    .map(
      clone =>
        `<details><summary>${escapeHtml(clone.firstFile.name)}:${clone.firstFile.start} ↔ ${escapeHtml(clone.secondFile.name)}:${clone.secondFile.start}</summary><pre>${escapeHtml(clone.fragment)}</pre></details>`
    )
    .join('\n');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Dadeto clone report</title><h1>Clone report</h1><p>${report.duplicates.length} clones · ${report.statistics.total.sources} sources</p>${blocks}</html>`;
}
