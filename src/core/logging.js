/**
 * Creates a logging function that prefixes messages with the given prefix.
 * Returns a no-op function if the base logger is falsy.
 * @param {Function} logger - The base logging function
 * @param {string} prefix - The prefix string to prepend
 * @returns {Function} The prefixed logger function
 */
export const createPrefixedLogger = (logger, prefix) => {
  if (logger) {
    return (...args) => logger(prefix, ...args);
  }
  return () => {};
};

/**
 * Creates a loggers object with each logger prefixed using the given prefix.
 * @param {object} loggers - Object containing logInfo, logError, and logWarning
 * @param {string} prefix - The prefix string to prepend to all log messages
 * @returns {object} The new loggers object with prefixed functions
 */
export const createPrefixedLoggers = (loggers, prefix) => ({
  logInfo: createPrefixedLogger(loggers.logInfo, prefix),
  logError: createPrefixedLogger(loggers.logError, prefix),
  logWarning: createPrefixedLogger(loggers.logWarning, prefix),
});
