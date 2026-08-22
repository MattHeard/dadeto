// Shared compatibility resolver for legacy inline and referenced space points.

/**
 * Resolve spacetime-point coordinate references while preserving legacy points.
 * @param {Array<Record<string, unknown>>} points Spacetime points.
 * @param {Array<Record<string, unknown>>} spacePoints Atemporal space points.
 * @param {boolean} requireCoordinates Whether coordinates are required.
 * @returns {Array<Record<string, unknown>>} Resolved points.
 */
export function resolvePointRecords(
  points,
  spacePoints = [],
  requireCoordinates = false
) {
  const byId = new Map(
    spacePoints.map(point => [String(point.spacePointId), point])
  );
  return points.map(point => resolvePoint(point, byId, requireCoordinates));
}

/**
 * Resolve one point and reject conflicting duplicated coordinates.
 * @param {Record<string, unknown>} point Spacetime point.
 * @param {Map<string, Record<string, unknown>>} spacePoints Space-point map.
 * @param {boolean} requireCoordinates Whether coordinates are required.
 * @returns {Record<string, unknown>} Coordinate-bearing point.
 */
export function resolvePoint(point, spacePoints, requireCoordinates = false) {
  const referenceId =
    point.spacePointId === undefined ? null : String(point.spacePointId).trim();
  const reference = referenceId ? spacePoints.get(referenceId) : null;
  const hasLatitude = point.latitude !== undefined;
  const hasLongitude = point.longitude !== undefined;
  if (referenceId && !reference)
    throw new Error(`Unknown space point: ${referenceId}`);
  if (!reference && requireCoordinates && (!hasLatitude || !hasLongitude))
    throw new Error(`Point ${point.pointId} has no coordinates.`);
  if (reference && hasLatitude !== hasLongitude)
    throw new Error(`Point ${point.pointId} has incomplete coordinates.`);
  if (
    reference &&
    hasLatitude &&
    (Number(point.latitude) !== Number(reference.latitude) ||
      Number(point.longitude) !== Number(reference.longitude))
  )
    throw new Error(`Point ${point.pointId} conflicts with its space point.`);
  return reference && !hasLatitude
    ? { ...point, latitude: reference.latitude, longitude: reference.longitude }
    : point;
}
