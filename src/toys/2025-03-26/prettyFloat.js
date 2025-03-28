export function decomposeFloat(input) {
  const num = Number(input);
  if (!Number.isFinite(num)) return "";

  const zeroResult = isZeroVariant(num);
  if (zeroResult !== null) return zeroResult;

  const A = formatDecimal(num);

  const parts = decomposeIEEE754(num);
  if (!parts || !('sign' in parts && 'mantissa' in parts && 'exponent' in parts)) {
    return "";
  }

  const { B, C } = getSignificandAndExponent(parts);

  return `${A} (${B.toString()} × 2^${C.toString()})`;
}

function isZeroVariant(num) {
  if (Object.is(num, 0)) return "0 (0 × 2^0)";
  if (Object.is(num, -0)) return "0 (-0 × 2^0)";
  return null;
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