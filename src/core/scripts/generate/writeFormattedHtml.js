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
  return async ({
    blog,
    configPath,
    outputPath,
    encoding = 'utf8',
    parser = 'html',
  }) => {
    const html = generateHtml(blog);

    try {
      const resolvedOptions = (await resolveConfig(configPath)) ?? {};
      const formattedHtml = await formatHtml(html, {
        ...resolvedOptions,
        parser,
      });

      writeFile(outputPath, formattedHtml, encoding);
      logInfo(`HTML formatted with Prettier and written to ${outputPath}`);
    } catch (error) {
      logError('Error formatting HTML', error);
      writeFile(outputPath, html, encoding);
      logInfo(`Unformatted HTML written to ${outputPath}`);
    }
  };
};
