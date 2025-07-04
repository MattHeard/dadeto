/**
 *
 * @param num
 */
function buildDecomposedResult(num) {
  const A = formatDecimal(num);
  const decomposition = getIEEEDecomposition(num);
  return formatFloatDecomposition(A, decomposition);
}

/**
 *
 * @param input
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
 *
 * @param num
 */
function getZeroVariantResult(num) {
  const result = isZeroVariant(num);
  if (result !== null) {
    return result;
  } else {
    return null;
  }
}

/**
 *
 * @param num
 */
function getIEEEDecomposition(num) {
  const parts = decomposeIEEE754(num);
  return getSignificandAndExponent(parts);
}

/**
 *
 * @param decimal
 * @param root0
 * @param root0.B
 * @param root0.C
 */
function formatFloatDecomposition(decimal, { B, C }) {
  return `${decimal} (${B.toString()} × 2^${C.toString()})`;
}

/**
 *
 * @param num
 */
function getZeroVariantString(num) {
  return getZeroVariantResult(num);
}

/**
 *
 * @param num
 */
function resolveZeroVariant(num) {
  const zeroResult = getZeroVariantString(num);
  if (zeroResult) {
    return zeroResult;
  } else {
    return null;
  }
}

/**
 *
 * @param num
 */
function isNotFinite(num) {
  return !Number.isFinite(num);
}

/**
 *
 * @param num
 */
function handleZeroVariantsOrNull(num) {
  const zeroVariant = resolveZeroVariant(num);
  if (zeroVariant) {
    return zeroVariant;
  }
  return null;
}

/**
 *
 * @param num
 */
function handleSimpleCases(num) {
  if (isNotFinite(num)) {
    return '';
  }
  return handleZeroVariantsOrNull(num);
}

/**
 *
 * @param n
 */
function isPositiveZero(n) {
  return Object.is(n, 0);
}

/**
 *
 * @param n
 */
function isNegativeZero(n) {
  return Object.is(n, -0);
}

/**
 *
 * @param num
 */
function isPositiveZeroResult(num) {
  if (isPositiveZero(num)) {
    return '0 (0 × 2^0)';
  } else {
    return null;
  }
}

/**
 *
 * @param num
 */
function isNegativeZeroResult(num) {
  if (isNegativeZero(num)) {
    return '0 (-0 × 2^0)';
  } else {
    return null;
  }
}

/**
 *
 * @param num
 */
function isZeroVariant(num) {
  if (isPositiveZeroResult(num)) {
    return isPositiveZeroResult(num);
  } else {
    return isNegativeZeroResult(num);
  }
}

/**
 *
 * @param num
 */
export function formatDecimal(num) {
  const A = num.toPrecision(17);
  if (A.includes('.')) {
    return A.replace(/\.?0+$/, '');
  } else {
    return A;
  }
}

/**
 *
 * @param root0
 * @param root0.sign
 * @param root0.mantissa
 * @param root0.exponent
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
 *
 * @param value
 */
function decomposeIEEE754(value) {
  const bits = getFloat64Bits(value);
  return extractIEEEComponents(bits);
}

/**
 *
 * @param value
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
 *
 * @param bits
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
