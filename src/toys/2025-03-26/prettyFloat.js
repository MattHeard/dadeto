function isNonFinite(input) {
  const num = Number(input);
  return !Number.isFinite(num);
}

function getZeroVariantResult(num) {
  const result = isZeroVariant(num);
  return result !== null ? result : null;
}

export function decomposeFloat(input) {
  if (isNonFinite(input)) return "";

  const num = Number(input);

  const zeroResult = getZeroVariantResult(num);
  if (zeroResult) return zeroResult;

  const A = formatDecimal(num);
  const parts = decomposeIEEE754(num);
  if (!isValidIEEEParts(parts)) return "";

  const { B, C } = getSignificandAndExponent(parts);
  return `${A} (${B.toString()} × 2^${C.toString()})`;
}

function isPositiveZero(n) {
  return Object.is(n, 0);
}

function isNegativeZero(n) {
  return Object.is(n, -0);
}

function isZeroVariant(num) {
  if (isPositiveZero(num)) return "0 (0 × 2^0)";
  if (isNegativeZero(num)) return "0 (-0 × 2^0)";
  return null;
}

function formatDecimal(num) {
  let A = num.toPrecision(17);
  return A.includes('.') ? A.replace(/\.?0+$/, '') : A;
}

function hasIEEEFields(parts) {
  return ['sign', 'mantissa', 'exponent'].every(key => key in parts);
}

function isValidIEEEParts(parts) {
  return Boolean(parts) && hasIEEEFields(parts);
}

function getSignificandAndExponent({ sign, mantissa, exponent }) {
  const signValue = sign === 0 ? 1n : -1n;
  const fullSignificand = (1n << 52n) | BigInt(mantissa);
  const B = signValue * fullSignificand;
  const C = BigInt(exponent - 1023) - 52n;
  return { B, C };
}

function decomposeIEEE754(value) {
  if (!Number.isFinite(value)) return {};

  const bits = getFloat64Bits(value);
  return extractIEEEComponents(bits);
}

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

function extractIEEEComponents(bits) {
  const sign = Number((bits >> 63n) & 1n);
  const exponentBits = (bits >> 52n) & 0x7FFn;
  const mantissaBits = bits & 0xFFFFFFFFFFFFFn;

  if (exponentBits === 0n) {
    return {};
  }

  return {
    sign,
    mantissa: Number(mantissaBits),
    exponent: Number(exponentBits),
  };
}