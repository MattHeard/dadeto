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
 * Prepare an HTML output writer whose filesystem effect is permission-bound.
 * @param {WriteFormattedHtmlDeps['writeFile']} writeFile File writer.
 * @param {WriteFormattedHtmlDeps['bindEffectBoundary']} bindEffectBoundary Runtime permission boundary.
 * @param {string} outputPath Destination file path.
 * @param {string | undefined} encoding Output encoding.
 * @returns {(contents: string) => Promise<void>} Permission-bound content writer.
 */
const createHtmlOutputWriter =
  (writeFile, bindEffectBoundary, outputPath, encoding) => contents =>
    bindEffectBoundary(async permission =>
      writeFile(permission, outputPath, contents, encoding)
    );

/**
 * Prepare the HTML formatter using the selected Prettier configuration.
 * @param {WriteFormattedHtmlDeps['resolveConfig']} resolveConfig Configuration resolver.
 * @param {WriteFormattedHtmlDeps['formatHtml']} formatHtml Prettier formatter.
 * @param {string} configPath Configuration path.
 * @param {string} parser Parser name.
 * @returns {(html: string) => Promise<string>} Formatter for generated HTML.
 */
const createHtmlFormatter =
  (resolveConfig, formatHtml, configPath, parser) => async html => {
    const resolvedOptions = (await resolveConfig(configPath)) ?? {};
    return formatHtml(html, { ...resolvedOptions, parser });
  };

/**
 * Prepare the format, write, and fallback flow for generated HTML.
 * @param {(html: string) => Promise<string>} formatHtml Prepared formatter.
 * @param {(contents: string) => Promise<void>} writeHtmlOutput Permission-bound writer.
 * @param {() => void} logFormatted Successful-format logger.
 * @param {(error: unknown) => void} logFallback Fallback logger.
 * @returns {(html: string) => Promise<void>} Writer with unformatted fallback.
 */
const createWriteWithFallback =
  (formatHtml, writeHtmlOutput, logFormatted, logFallback) => async html => {
    try {
      const formattedHtml = await formatHtml(html);
      await writeHtmlOutput(formattedHtml);
      logFormatted();
    } catch (error) {
      logFallback(error);
      await writeHtmlOutput(html);
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
  return function writeFormattedHtml({
    blog,
    configPath,
    outputPath,
    ...rest
  }) {
    const { encoding, parser } = { ...DEFAULT_WRITE_OPTIONS, ...rest };
    const html = deps.generateHtml(blog);
    const format = createHtmlFormatter(
      deps.resolveConfig,
      deps.formatHtml,
      configPath,
      parser
    );
    const write = createHtmlOutputWriter(
      deps.writeFile,
      deps.bindEffectBoundary,
      outputPath,
      encoding
    );
    return createWriteWithFallback(
      format,
      write,
      () =>
        deps.logInfo(
          `HTML formatted with Prettier and written to ${outputPath}`
        ),
      error => {
        deps.logError('Error formatting HTML', error);
        deps.logInfo(`Unformatted HTML written to ${outputPath}`);
      }
    )(html);
  };
};
