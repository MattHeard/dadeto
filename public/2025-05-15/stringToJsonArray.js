/*
 * String to JSON Array Toy
 * ----------------------------------------------------------
 * Toy signature:  stringToJsonArrayToy(input: string, env: Env): string
 *   input : delimited string (default delimiter: \n)
 *   env   : { delimiter?: string }
 * Returns a JSON string of an array, or { error }
 */

function stringToJsonArrayToy(input, env = {}) {
  try {
    const delimiter = typeof env.delimiter === 'string' ? env.delimiter : '\n';
    const arr = input
      .split(delimiter)
      .map(s => s.trim())
      .filter(Boolean);
    return JSON.stringify(arr);
  } catch (e) {
    return JSON.stringify({ error: e && e.message ? e.message : 'Unknown error' });
  }
}

export { stringToJsonArrayToy };
