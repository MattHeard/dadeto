/*
 * String to JSON Array Toy
 * ----------------------------------------------------------
 * Toy signature:  stringToJsonArrayToy(input: string): string
 *   input : delimited string (default delimiter: \n)
 * Returns a JSON string of an array, or []
 */

function stringToJsonArrayToy(input) {
  try {
    const delimiter = ',';
    const arr = input
      .split(delimiter)
      .map(s => s.trim())
      .filter(Boolean);
    return JSON.stringify(arr);
  } catch (e) {
    return JSON.stringify([]);
  }
}

export { stringToJsonArrayToy };
