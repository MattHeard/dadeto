function buildDecomposedResult(num) {
  const A = formatDecimal(num);
  const decomposition = getIEEEDecomposition(num);
  return formatFloatDecomposition(A, decomposition);
}

export function decomposeFloat(input) {
  const num = Number(input);
  const simple = handleSimpleCases(num);
  if (simple !== null) return simple;
  return buildDecomposedResult(num);
}

function getZeroVariantResult(num) {
  const result = isZeroVariant(num);
  return result !== null ? result : null;
}

function getIEEEDecomposition(num) {
  const parts = decomposeIEEE754(num);
  return getSignificandAndExponent(parts);
}

function formatFloatDecomposition(decimal, { B, C }) {
  return `${decimal} (${B.toString()} × 2^${C.toString()})`;
}

function getZeroVariantString(num) {
  return getZeroVariantResult(num);
}

function resolveZeroVariant(num) {
  const zeroResult = getZeroVariantString(num);
  return zeroResult ? zeroResult : null;
}

function handleSimpleCases(num) {
  if (!Number.isFinite(num)) return "";
  const zeroVariant = resolveZeroVariant(num);
  if (zeroVariant) return zeroVariant;
  return null;
}

function isPositiveZero(n) {
  return Object.is(n, 0);
}

function isNegativeZero(n) {
  return Object.is(n, -0);
}

function isPositiveZeroResult(num) {
  return isPositiveZero(num) ? "0 (0 × 2^0)" : null;
}

function isNegativeZeroResult(num) {
  return isNegativeZero(num) ? "0 (-0 × 2^0)" : null;
}

function isZeroVariant(num) {
  return isPositiveZeroResult(num) || isNegativeZeroResult(num);
}

function formatDecimal(num) {
  let A = num.toPrecision(17);
  return A.includes('.') ? A.replace(/\.?0+$/, '') : A;
}



function getSignificandAndExponent({ sign, mantissa, exponent }) {

  const signValue = sign === 0 ? 1n : -1n;
  const fullSignificand = (1n << 52n) | BigInt(mantissa);
  const B = signValue * fullSignificand;
  const C = BigInt(exponent - 1023) - 52n;
  return { B, C };
}

function decomposeIEEE754(value) {
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
    // Subnormal number (mantissaBits !== 0n), zero is handled by handleSimpleCases
    return {
      sign,
      mantissa: Number(mantissaBits),
      exponent: 1 // Will be interpreted as exponent - 1023 = -1022
    };
  }

  return {
    sign,
    mantissa: Number(mantissaBits),
    exponent: Number(exponentBits),
  };
}