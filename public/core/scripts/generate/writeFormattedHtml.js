/**
 * Factory for writing formatted HTML generated from blog data.
 * @param {Object} deps dependency injection container
 * @param {Function} deps.generateHtml function producing HTML from the provided blog data
 * @param {Function} deps.resolveConfig function resolving Prettier configuration
 * @param {Function} deps.formatHtml function formatting HTML content
 * @param {Function} deps.writeFile function persisting formatted output
 * @param {Function} deps.logInfo logger invoked for informational messages
 * @param {Function} deps.logError logger invoked for error messages
 * @returns {Function} async writer that persists formatted HTML with graceful fallback
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
