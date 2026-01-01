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

const writeUnformattedHtml = (
  { logError, writeFile, logInfo, outputPath, html, encoding },
  error
) => {
  logError('Error formatting HTML', error);
  writeFile(outputPath, html, encoding);
  logInfo(`Unformatted HTML written to ${outputPath}`);
};

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
