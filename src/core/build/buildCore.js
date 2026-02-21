/**
 * Build an exports object from explicit name/value tuples.
 * @param {Array<[string, unknown]>} entries - Name/value pairs to expose.
 * @returns {Record<string, unknown>} Combined helpers ready for export.
 */
export function buildCopyExportMap(entries) {
  return Object.fromEntries(entries);
}

/**
 * @typedef {object} WriteFormattedHtmlDeps
 * @property {(blog: unknown) => string} generateHtml Function producing HTML from the provided blog data.
 * @property {(configPath: string) => Promise<object | null>} resolveConfig Function resolving Prettier configuration.
 * @property {(html: string, options: object) => Promise<string>} formatHtml Function formatting HTML content.
 * @property {(outputPath: string, contents: string, encoding?: string) => void} writeFile Function persisting formatted output.
 * @property {(...args: any[]) => void} logInfo Logger invoked for informational messages.
 * @property {(message: string, error: unknown) => void} logError Logger invoked for error messages.
 */

/**
 * Format HTML using Prettier and write the result.
 * @param {object} params - Formatting parameters.
 * @param {(configPath: string) => Promise<object | null>} params.resolveConfig - Resolve Prettier config.
 * @param {(html: string, options: object) => Promise<string>} params.formatHtml - Format HTML with Prettier.
 * @param {string} params.configPath - Path to Prettier config.
 * @param {string} params.html - HTML to format.
 * @param {string} params.parser - HTML parser name.
 * @param {string} params.outputPath - Where to write output.
 * @param {string} [params.encoding] - File encoding.
 * @param {(outputPath: string, contents: string, encoding?: string) => void} params.writeFile - Write file function.
 * @param {(...args: any[]) => void} params.logInfo - Info logger.
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
 * @param {object} params - Write parameters.
 * @param {(message: string, error: unknown) => void} params.logError - Error logger.
 * @param {(outputPath: string, contents: string, encoding?: string) => void} params.writeFile - Write file function.
 * @param {(...args: any[]) => void} params.logInfo - Info logger.
 * @param {string} params.outputPath - Where to write output.
 * @param {string} params.html - HTML content.
 * @param {string} [params.encoding] - File encoding.
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
 * @param {any} options - Write options.
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
