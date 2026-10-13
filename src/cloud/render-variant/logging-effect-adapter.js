/**
 * Log a recoverable render-variant failure.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Permission for logging.
 * @param {...unknown} values Log values.
 * @returns {void} Completes the logging command.
 */
export function logRenderVariantError(allowEffects, ...values) {
  void allowEffects;
  console.error(...values);
}
