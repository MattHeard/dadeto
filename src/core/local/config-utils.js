/**
 * @param {unknown} value Candidate string.
 * @param {string} fallback Fallback string.
 * @returns {string} Normalized string.
 */
export function normalizeString(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {unknown} value Candidate number.
 * @param {number} fallback Fallback number.
 * @returns {number} Positive finite number or fallback.
 */
export function normalizePositiveNumber(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

/**
 * @param {unknown} value Candidate non-negative integer.
 * @param {number} fallback Fallback number.
 * @returns {number} Non-negative integer or fallback.
 */
export function normalizeNonNegativeInteger(value, fallback) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

/**
 * @param {unknown} value Candidate path value.
 * @param {string} fallback Fallback path value.
 * @returns {string} Normalized path value.
 */
export function normalizePathValue(value, fallback) {
  return normalizeString(value, fallback);
}

/**
 * Resolve a repo-relative file path for a local config loader.
 * @param {{
 *   repoRoot?: string,
 *   cwd?: () => string,
 *   pathModule?: { resolve: (first: string, ...parts: string[]) => string },
 *   [key: string]: unknown,
 * }} options Loader options.
 * @param {string} pathKey Option key that may override the default file path.
 * @param {string} defaultRelativePath Default repo-relative file path.
 * @returns {{ repoRoot: string, filePath: string }} Resolved repo root and file path.
 */
export function resolveLocalFilePath(options, pathKey, defaultRelativePath) {
  const repoRoot = options.repoRoot ?? options.cwd?.() ?? '';
  const pathModule = options.pathModule;

  if (!pathModule) {
    throw new Error('pathModule is required.');
  }

  return {
    repoRoot,
    filePath: pathModule.resolve(
      repoRoot,
      /** @type {string | undefined} */ (options[pathKey]) ??
        defaultRelativePath
    ),
  };
}

/**
 * Resolve the file path and injected reader for a local config loader.
 * @param {{
 *   repoRoot?: string,
 *   cwd?: () => string,
 *   pathModule?: { resolve: (first: string, ...parts: string[]) => string },
 *   readFileImpl?: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   [key: string]: unknown,
 * }} options Loader options.
 * @param {string} pathKey Option key that may override the default file path.
 * @param {string} defaultRelativePath Default repo-relative file path.
 * @returns {{
 *   repoRoot: string,
 *   filePath: string,
 *   pathModule: { resolve: (first: string, ...parts: string[]) => string },
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
 * }} Resolved local config loader inputs.
 */
export function resolveLocalConfigLoader(
  options,
  pathKey,
  defaultRelativePath
) {
  const { repoRoot, filePath } = resolveLocalFilePath(
    options,
    pathKey,
    defaultRelativePath
  );
  const pathModule =
    /** @type {{ resolve: (first: string, ...parts: string[]) => string }} */ (
      options.pathModule
    );
  const readFileImpl = options.readFileImpl;

  if (!readFileImpl) {
    throw new Error('readFileImpl is required.');
  }

  return {
    repoRoot,
    filePath,
    pathModule,
    readFileImpl,
  };
}

/**
 * @param {unknown} value Candidate string array.
 * @param {string[]} fallback Fallback string array.
 * @returns {string[]} Normalized string array.
 */
export function normalizeStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return [...fallback];
  }

  return normalized;
}
