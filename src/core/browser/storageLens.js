/**
 * @module storageLens
 * @description Functional programming lenses for storage operations.
 * A lens is a composable getter/setter pair that provides a functional interface
 * for reading and writing data to different storage backends.
 */

/**
 * @typedef {object} StorageLens
 * @property {(key: string) => unknown} get - Read data from storage by key.
 * @property {(key: string, value: unknown) => void} set - Write data to storage by key.
 */

/**
 * Creates a storage lens from getter and setter functions.
 * @param {(key: string) => unknown} getter - Function to read from storage.
 * @param {(key: string, value: unknown) => void} setter - Function to write to storage.
 * @returns {StorageLens} A lens object with get and set operations.
 */
export function createStorageLens(getter, setter) {
  return {
    get: getter,
    set: setter,
  };
}

/**
 * Creates a lens that operates on a subset of data within a parent lens.
 * @param {StorageLens} parentLens - The parent lens to compose with.
 * @param {string} key - The key to focus on within the parent data.
 * @returns {StorageLens} A focused lens.
 */
export function focusLens(parentLens, key) {
  return createStorageLens(
    () => {
      const data = parentLens.get(key);
      return data;
    },
    value => {
      parentLens.set(key, value);
    }
  );
}

/**
 * Creates a lens with a transformation applied on get and set.
 * @param {StorageLens} lens - The base lens.
 * @param {(value: unknown) => unknown} getTransform - Transform applied when getting.
 * @param {(value: unknown) => unknown} setTransform - Transform applied when setting.
 * @returns {StorageLens} A transformed lens.
 */
export function mapLens(lens, getTransform, setTransform) {
  return createStorageLens(
    key => getTransform(lens.get(key)),
    (key, value) => lens.set(key, setTransform(value))
  );
}
