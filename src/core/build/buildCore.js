export {
  buildCopyLogMessage,
  createMappedTask,
  formatPathRelativeToProject,
  runEntriesInParallel,
  runMappedEntries,
} from '../commonCore.js';

/**
 * @typedef {object} WriteFormattedHtmlDeps
 * @property {(blog: unknown) => string} generateHtml Function producing HTML from the provided blog data.
 * @property {(configPath: string) => Promise<object | null>} resolveConfig Function resolving Prettier configuration.
 * @property {(html: string, options: object) => Promise<string>} formatHtml Function formatting HTML content.
 * @property {(outputPath: string, contents: string, encoding?: string) => void} writeFile Function persisting formatted output.
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
 * @property {(outputPath: string, contents: string, encoding?: string) => void} writeFile File writer.
 * @property {(message: string) => void} logInfo Informational logger.
 */

/** @typedef {FormatOptions & { logError: (message: string, error: unknown) => void }} WriteOptions */

/**
 * Format HTML using Prettier and write the result.
 * @param {FormatOptions} params - Formatting parameters.
 * @returns {Promise<void>}
 */
const formatWithPrettier = async ({
  resolveConfig,
  formatHtml,
  configPath,
  html,
  parser,
  outputPath,
  encoding,
  writeFile,
  logInfo,
}) => {
  const resolvedOptions = (await resolveConfig(configPath)) ?? {};
  const formattedHtml = await formatHtml(html, {
    ...resolvedOptions,
    parser,
  });

  writeFile(outputPath, formattedHtml, encoding);
  logInfo(`HTML formatted with Prettier and written to ${outputPath}`);
};

/**
 * Write unformatted HTML as fallback when formatting fails.
 * @param {WriteOptions} params - Write parameters.
 * @param {unknown} error - The error that occurred during formatting.
 * @returns {void}
 */
const writeUnformattedHtml = (
  { logError, writeFile, logInfo, outputPath, html, encoding },
  error
) => {
  logError('Error formatting HTML', error);
  writeFile(outputPath, html, encoding);
  logInfo(`Unformatted HTML written to ${outputPath}`);
};

/**
 * Write HTML with fallback handling.
 * @param {WriteOptions} options - Write options.
 * @returns {Promise<void>}
 */
const writeWithFallback = async options => {
  try {
    await formatWithPrettier(options);
  } catch (error) {
    writeUnformattedHtml(options, error);
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
export const createWriteFormattedHtml = ({
  generateHtml,
  resolveConfig,
  formatHtml,
  writeFile,
  logInfo,
  logError,
}) => {
  return function writeFormattedHtml({
    blog,
    configPath,
    outputPath,
    ...rest
  }) {
    return writeWithFallback({
      resolveConfig,
      formatHtml,
      writeFile,
      logInfo,
      logError,
      ...DEFAULT_WRITE_OPTIONS,
      ...rest,
      html: generateHtml(blog),
      configPath,
      outputPath,
    });
  };
};
