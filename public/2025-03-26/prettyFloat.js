/**
 * Decomposes a finite JavaScript number into a string of the form:
 *
 *    "A (B × 2^C)"
 *
 * where:
 *   - A is the decimal representation (17-digit round-trip safe)
 *   - B is the signed integer representing the full significand
 *         (i.e. (1 << 52) | mantissa, with sign applied)
 *   - C is the adjusted exponent (exponent - 1023 - 52)
 *
 * @param {string} input - any finite number as a string (NaN and ±Infinity return "")
 * @returns {string} the decomposed string
 */
export function decomposeFloat(input) {
  const num = Number(input);
  if (!Number.isFinite(num)) {
    return "";
  }
  if (Object.is(num, 0)) {
    return "0 (0 × 2^0)";
  }
  if (Object.is(num, -0)) {
    return "0 (-0 × 2^0)";
  }
  
  // A: the decimal representation with full precision
  let A = num.toPrecision(17);
  if (A.indexOf('.') !== -1) {
    A = A.replace(/\.?0+$/, '');
  }
  
  // Get IEEE754 parts
  const parts = decomposeIEEE754(num);
  // If parts is empty, return empty string
  if (!parts || !('sign' in parts && 'mantissa' in parts && 'exponent' in parts)) {
    return "";
  }
  const { sign, mantissa, exponent } = parts;
  // Convert sign bit to ±1 (0 becomes +1, 1 becomes -1)
  const signValue = (sign === 0 ? 1n : -1n);
  // The full significand (implicit 1 included)
  const fullSignificand = (1n << 52n) | BigInt(mantissa);
  // B: signed full significand
  const B = signValue * fullSignificand;
  // C: adjusted exponent: unbiased exponent minus 52
  const C = BigInt(exponent - 1023) - 52n;
  
  return `${A} (${B.toString()} × 2^${C.toString()})`;
}

function decomposeIEEE754(value) {
  if (!Number.isFinite(value)) {
    return {};
  }

  const buffer = new ArrayBuffer(8);
  const floatView = new Float64Array(buffer);
  const byteView = new Uint8Array(buffer);

  floatView[0] = value;

  // Assemble the 64-bit binary representation
  let bits = 0n;
  for (let i = 7; i >= 0; i--) {
    bits = (bits << 8n) | BigInt(byteView[i]);
  }

  const sign = Number((bits >> 63n) & 1n);
  const exponentBits = (bits >> 52n) & 0x7FFn;
  const mantissaBits = bits & 0xFFFFFFFFFFFFFn;

  if (exponentBits === 0n) {
    return {};
  }

  return {
    sign,
    mantissa: Number(mantissaBits),         // 52 bits
    exponent: Number(exponentBits),         // still biased
  };
}