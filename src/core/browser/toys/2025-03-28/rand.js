/**
 * A function that takes a string and a Map containing a function,
 * ignores the string, and returns the result of calling the function.
 * @param {string} input - A string input that is ignored
 * @param {Map<string, () => unknown>} env - A Map containing a key "getRandomNumber".
 * @returns {*} The result of calling the getRandomNumber function
 */
export function rand(input, env) {
  // Ignore the input string
  // Extract the getRandomNumber function from the env Map
  const getRandomNumber = env.get('getRandomNumber');

  if (!getRandomNumber) {
    throw new Error('getRandomNumber helper is missing');
  }

  // Call and return the result of the getRandomNumber function
  return getRandomNumber();
}
