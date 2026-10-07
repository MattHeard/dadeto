export {
  buildCopyLogMessage,
  createMappedTask,
  formatPathRelativeToProject,
  runEntriesInParallel,
  runMappedEntries,
} from '../commonCore.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * @typedef {object} WriteFormattedHtmlDeps
 * @property {(blog: unknown) => string} generateHtml Function producing HTML from the provided blog data.
 * @property {(configPath: string) => Promise<object | null>} resolveConfig Function resolving Prettier configuration.
 * @property {(html: string, options: object) => Promise<string>} formatHtml Function formatting HTML content.
 * @property {(permission: AllowEffects, outputPath: string, contents: string, encoding?: string) => void} writeFile Function persisting formatted output.
 * @property {import('../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Runtime permission boundary.
 * @property {(message: string) => void} logInfo Logger invoked for informational messages.
 * @property {(message: string, error: unknown) => void} logError Logger invoked for error messages.
 */

/**
 * @typedef {object} FormatOptions
 * @property {(configPath: string) => Promise<object | null>} resolveConfig Resolve Prettier configuration.
 * @property {(html: string, options: object) => Promise<string>} formatHtml Format HTML content.
 * @property {string} configPath Prettier configuration path.
 * @property {string} html HTML content to format.
 * @property {string} parser Prettier parser name.
 * @property {string} outputPath Destination file path.
 * @property {string} [encoding] Output encoding.
 * @property {(permission: AllowEffects, outputPath: string, contents: string, encoding?: string) => void} writeFile File writer.
 * @property {import('../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Runtime permission boundary.
 * @property {(message: string) => void} logInfo Informational logger.
 */

/** @typedef {FormatOptions & { logError: (message: string, error: unknown) => void }} WriteOptions */

/**
 * Format HTML using Prettier and write the result.
 * @param {FormatOptions} options Formatting parameters.
 * @returns {Promise<void>}
 */
const formatWithPrettier = async options => {
  const {
    resolveConfig,
    formatHtml,
    configPath,
    html,
    parser,
    outputPath,
    logInfo,
  } = options;
  const resolvedOptions = (await resolveConfig(configPath)) ?? {};
  const formattedHtml = await formatHtml(html, {
    ...resolvedOptions,
    parser,
  });

  await writeHtmlOutput(options, formattedHtml);
  logInfo(`HTML formatted with Prettier and written to ${outputPath}`);
};

/**
 * Write unformatted HTML as fallback when formatting fails.
 * @param {WriteOptions} options Write parameters.
 * @param {unknown} error - The error that occurred during formatting.
 * @returns {Promise<void>}
 */
const writeUnformattedHtml = async (options, error) => {
  const { logError, logInfo, outputPath, html } = options;
  logError('Error formatting HTML', error);
  await writeHtmlOutput(options, html);
  logInfo(`Unformatted HTML written to ${outputPath}`);
};

/**
 * Persist generated HTML through the runtime permission boundary.
 * @param {FormatOptions} options Output and permission dependencies.
 * @param {string} contents HTML contents to persist.
 * @returns {Promise<void>} Completion after the filesystem write.
 */
async function writeHtmlOutput(options, contents) {
  const { writeFile, bindEffectBoundary, outputPath, encoding } = options;
  await bindEffectBoundary(async permission =>
    writeFile(permission, outputPath, contents, encoding)
  );
}

/**
 * Write HTML with fallback handling.
 * @param {WriteOptions} options - Write options.
 * @returns {Promise<void>}
 */
const writeWithFallback = async options => {
  try {
    await formatWithPrettier(options);
  } catch (error) {
    await writeUnformattedHtml(options, error);
  }
};

const DEFAULT_WRITE_OPTIONS = {
  encoding: 'utf8',
  parser: 'html',
};

/**
 * Factory for writing formatted HTML generated from blog data.
 * @param {WriteFormattedHtmlDeps} deps Dependency injection container for formatting helpers.
 * @returns {(args: { blog: unknown, configPath: string, outputPath: string, encoding?: string, parser?: string }) => Promise<void>} Async writer that persists formatted HTML with graceful fallback.
 */
export const createWriteFormattedHtml = deps => {
  const { generateHtml } = deps;
  return function writeFormattedHtml({
    blog,
    configPath,
    outputPath,
    ...rest
  }) {
    return writeWithFallback({
      ...deps,
      ...DEFAULT_WRITE_OPTIONS,
      ...rest,
      html: generateHtml(blog),
      configPath,
      outputPath,
    });
  };
};
