function buildDecomposedResult(num) {
  const A = formatDecimal(num);
  const decomposition = getIEEEDecomposition(num);
  return formatFloatDecomposition(A, decomposition);
}

export function decomposeFloat(input) {
  const num = Number(input);
  const simple = handleSimpleCases(num);
  if (simple !== null) {return simple;}
  return buildDecomposedResult(num);
}

function getZeroVariantResult(num) {
  const result = isZeroVariant(num);
  if (result !== null) {
    return result;
  } else {
    return null;
  }
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
  if (zeroResult) {
    return zeroResult;
  } else {
    return null;
  }
}

function isNotFinite(num) {
  return !Number.isFinite(num);
}

function handleZeroVariantsOrNull(num) {
  const zeroVariant = resolveZeroVariant(num);
  if (zeroVariant) {return zeroVariant;}
  return null;
}

function handleSimpleCases(num) {
  if (isNotFinite(num)) {return "";}
  return handleZeroVariantsOrNull(num);
}

function isPositiveZero(n) {
  return Object.is(n, 0);
}

function isNegativeZero(n) {
  return Object.is(n, -0);
}

function isPositiveZeroResult(num) {
  if (isPositiveZero(num)) {
    return "0 (0 × 2^0)";
  } else {
    return null;
  }
}

function isNegativeZeroResult(num) {
  if (isNegativeZero(num)) {
    return "0 (-0 × 2^0)";
  } else {
    return null;
  }
}

function isZeroVariant(num) {
  if (isPositiveZeroResult(num)) {
    return isPositiveZeroResult(num);
  } else {
    return isNegativeZeroResult(num);
  }
}

export function formatDecimal(num) {
  const A = num.toPrecision(17);
  if (A.includes('.')) {
    return A.replace(/\.?0+$/, '');
  } else {
    return A;
  }
}



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



  return {
    sign,
    mantissa: Number(mantissaBits),
    exponent: Number(exponentBits),
  };
}