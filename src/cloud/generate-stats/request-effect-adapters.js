/** Send an HTTP response from the request boundary. */
export function sendHttpResponse(allowEffects, res, response) {
  void allowEffects;
  const result = res.status(response.status);
  result[response.method](response.body);
}

/** Log an error from the request boundary. */
export function logError(allowEffects, logger, ...args) {
  void allowEffects;
  logger.error(...args);
}

/** Log a warning from the request boundary. */
export function logWarning(allowEffects, logger, ...args) {
  void allowEffects;
  logger.warn?.(...args);
}
