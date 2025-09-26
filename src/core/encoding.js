/**
 * Returns a Base64 encoding function using the provided btoa and
 * encodeURIComponent helpers. This avoids the deprecated unescape by manually
 * converting percent-encoded bytes back to a binary string.
 * @param {Function} btoa - The btoa function
 * @param {Function} encodeURIComponentFn - The encodeURIComponent function
 * @returns {Function} encodeBase64 - Function that encodes a string to Base64
 */
export function getEncodeBase64(btoa, encodeURIComponentFn) {
  const toBinary = str =>
    encodeURIComponentFn(str).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  return str => btoa(toBinary(str));
}
