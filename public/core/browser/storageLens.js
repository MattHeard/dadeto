/**
 * @module storageLens
 * @description Functional programming lenses for storage operations.
 * A lens is a composable getter/setter pair that provides a functional interface
 * for reading and writing data to different storage backends.
 */

/**
 * @template TValue=unknown
 * @typedef {object} StorageLens
 * @property {(key: string) => TValue} get - Read data from storage by key.
 * @property {(key: string, value: TValue) => void} set - Write data to storage by key.
 */

/**
 * Creates a storage lens from getter and setter functions.
 * @template TValue
 * @param {(key: string) => TValue} getter - Function to read from storage.
 * @param {(key: string, value: TValue) => void} setter - Function to write to storage.
 * @returns {StorageLens<TValue>} A lens object with get and set operations.
 */
export function createStorageLens(getter, setter) {
  return {
    get: getter,
    set: setter,
  };
}

/**
 * Creates a lens that operates on a subset of data within a parent lens.
 * @template TValue
 * @param {StorageLens<TValue>} parentLens - The parent lens to compose with.
 * @param {string} key - The key to focus on within the parent data.
 * @returns {StorageLens<TValue>} A focused lens.
 */
export function focusLens(parentLens, key) {
  return createStorageLens(
    () => parentLens.get(key),
    (...args) => {
      let value;
      if (args.length >= 2) {
        value = args[1];
      } else {
        value = args[0];
      }
      parentLens.set(key, value);
    }
  );
}

/**
 * Creates a lens with a transformation applied on get and set.
 * @template TBase
 * @template TDerived
 * @param {StorageLens<TBase>} lens - The base lens.
 * @param {(value: TBase) => TDerived} getTransform - Transform applied when getting.
 * @param {(value: TDerived) => TBase} setTransform - Transform applied when setting.
 * @returns {StorageLens<TDerived>} A transformed lens.
 */
export function mapLens(lens, getTransform, setTransform) {
  return createStorageLens(
    key => getTransform(lens.get(key)),
    (key, value) => lens.set(key, setTransform(value))
  );
}
