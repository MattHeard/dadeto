/**
 * Increment a variant name in base-26 alphabetic order.
 * @param {string} name Current variant name.
 * @returns {string} Next variant name.
 */
export function incrementVariantName(name) {
  const letters = name.split('');
  let i = letters.length - 1;
  while (i >= 0) {
    const code = letters[i].charCodeAt(0);
    if (code >= 97 && code < 122) {
      letters[i] = String.fromCharCode(code + 1);
      return letters.join('');
    }
    letters[i] = 'a';
    i -= 1;
  }
  return 'a'.repeat(name.length + 1);
}
