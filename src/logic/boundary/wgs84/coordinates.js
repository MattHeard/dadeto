/** @typedef {[number, number, number, number]} Wgs84Coordinates */

/**
 * Interpret public coordinates in their original left-to-right coercion order.
 * Preserve non-finite numbers and original coercion failures without defaults.
 * @param {unknown} latitude1 First latitude.
 * @param {unknown} longitude1 First longitude.
 * @param {unknown} latitude2 Second latitude.
 * @param {unknown} longitude2 Second longitude.
 * @returns {{ok: true, coordinates: Wgs84Coordinates} | {ok: false, error: unknown}} Parsed numbers or the original failure.
 */
export function parseWgs84Coordinates(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  try {
    return {
      ok: true,
      coordinates: [
        Number(latitude1),
        Number(longitude1),
        Number(latitude2),
        Number(longitude2),
      ],
    };
  } catch (error) {
    return { ok: false, error };
  }
}
