import { when } from '#core/browser/common';

/**
 * Build a formatted decomposition string for a number.
 * @param {number} num - Number to decompose.
 * @returns {string} Human readable decomposition.
 */
function buildDecomposedResult(num) {
  const decimal = formatDecimal(num);
  const decomposition = getIEEEDecomposition(num);
  return formatFloatDecomposition(decimal, decomposition);
}

/**
 * Convert input to a number and generate its decomposition string.
 * @param {string|number} input - Value to parse.
 * @returns {string} Decomposed representation.
 */
export function decomposeFloat(input) {
  const num = Number(input);
  const simple = handleSimpleCases(num);
  if (simple !== null) {
    return simple;
  }
  return buildDecomposedResult(num);
}

/**
 * Return the formatted representation for zero variants or null.
 * @param {number} num - Number to evaluate.
 * @returns {string|null} Result string or null.
 */
function getZeroVariantResult(num) {
  return isZeroVariant(num);
}

/**
 * Get the IEEE 754 decomposition for a number.
 * @param {number} num - Number to decompose.
 * @returns {{B: bigint, C: bigint}} The B and C components.
 */
function getIEEEDecomposition(num) {
  const parts = decomposeIEEE754(num);
  return getSignificandAndExponent(parts);
}

/**
 * Format the float decomposition.
 * @param {string} decimal - Decimal representation of the number.
 * @param {{B: bigint, C: bigint}} param1 - Components from IEEE decomposition.
 * @returns {string} Formatted output string.
 */
function formatFloatDecomposition(decimal, { B: b, C: c }) {
  const significand = b.toString();
  const exponent = c.toString();
  return `${decimal} (${significand} × 2^${exponent})`;
}

/**
 * Get the zero variant string if applicable.
 * @param {number} num - Number to check.
 * @returns {string|null} Variant string or null.
 */
function getZeroVariantString(num) {
  return getZeroVariantResult(num);
}

/**
 * Resolve zero variant string or return null when not a zero variant.
 * @param {number} num - Number to evaluate.
 * @returns {string|null} Zero variant string or null.
 */
function resolveZeroVariant(num) {
  return getZeroVariantString(num);
}

/**
 * Determine if a number is not finite.
 * @param {number} num - Number to test.
 * @returns {boolean} True if NaN or infinite.
 */
function isNotFinite(num) {
  return !Number.isFinite(num);
}

/**
 * Return a zero variant string when applicable.
 * @param {number} num - Number to evaluate.
 * @returns {string|null} Zero variant representation or null.
 */
function handleZeroVariantsOrNull(num) {
  return resolveZeroVariant(num);
}

/**
 * Handle infinite and zero values before full decomposition.
 * @param {number} num - Number to check.
 * @returns {string|null} Simple representation or null.
 */
function handleSimpleCases(num) {
  if (isNotFinite(num)) {
    return '';
  }
  return handleZeroVariantsOrNull(num);
}

/**
 * Check if the number is +0.
 * @param {number} n - Number to test.
 * @returns {boolean} True if +0.
 */
function isPositiveZero(n) {
  return Object.is(n, 0);
}

/**
 * Check if the number is -0.
 * @param {number} n - Number to test.
 * @returns {boolean} True if -0.
 */
function isNegativeZero(n) {
  return Object.is(n, -0);
}

/**
 * Return formatted text if the number is +0.
 * @param {number} num - Number to check.
 * @returns {string|null} Result string or null.
 */
function isPositiveZeroResult(num) {
  return when(isPositiveZero(num), () => '0 (0 × 2^0)');
}

/**
 * Return formatted text if the number is -0.
 * @param {number} num - Number to check.
 * @returns {string|null} Result string or null.
 */
function isNegativeZeroResult(num) {
  return when(isNegativeZero(num), () => '0 (-0 × 2^0)');
}

/**
 * Determine if the number is a zero variant and return the string.
 * @param {number} num - Number to check.
 * @returns {string|null} Result string or null.
 */
function isZeroVariant(num) {
  return when(
    isPositiveZero(num),
    () => isPositiveZeroResult(num),
    () => isNegativeZeroResult(num)
  );
}

/**
 * Format a number removing trailing zeros while keeping precision.
 * @param {number} num - Number to format.
 * @returns {string} Formatted decimal string.
 */
export function formatDecimal(num) {
  const result = num.toPrecision(17);
  if (result.includes('.')) {
    return result.replace(/\.?0+$/, '');
  } else {
    return result;
  }
}

/**
 * Compute B and C values from IEEE component parts.
 * @param {{sign: number, mantissa: number, exponent: number}} param0 - IEEE components.
 * @returns {{B: bigint, C: bigint}} Calculated values.
 */
function getSignificandAndExponent({ sign, mantissa, exponent }) {
  let signValue;
  if (sign === 0) {
    signValue = 1n;
  } else {
    signValue = -1n;
  }
  const fullSignificand = (1n << 52n) | BigInt(mantissa);
  const B = signValue * fullSignificand;
  const C = BigInt(exponent - 1023) - 52n;
  return { B, C };
}

/**
 * Decompose a number into IEEE 754 components.
 * @param {number} value - Floating point value.
 * @returns {{sign: number, mantissa: number, exponent: number}} Components.
 */
function decomposeIEEE754(value) {
  const bits = getFloat64Bits(value);
  return extractIEEEComponents(bits);
}

/**
 * Convert a double value into its raw 64-bit representation.
 * @param {number} value - Number to convert.
 * @returns {bigint} 64-bit representation.
 */
function getFloat64Bits(value) {
  const buffer = new ArrayBuffer(8);
  const floatView = new Float64Array(buffer);
  const byteView = new Uint8Array(buffer);

  floatView[0] = value;

  let bits = 0n;
  for (let i = 7; i >= 0; i--) {
    bits = (bits << 8n) | BigInt(byteView[i]);
  }

  return bits;
}

/**
 * Extract IEEE 754 components from raw bits.
 * @param {bigint} bits - 64-bit float representation.
 * @returns {{sign: number, mantissa: number, exponent: number}} Components.
 */
function extractIEEEComponents(bits) {
  const sign = Number((bits >> 63n) & 1n);
  const exponentBits = (bits >> 52n) & 0x7ffn;
  const mantissaBits = bits & 0xfffffffffffffn;

  return {
    sign,
    mantissa: Number(mantissaBits),
    exponent: Number(exponentBits),
  };
}
