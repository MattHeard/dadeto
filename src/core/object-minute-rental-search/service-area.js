import { wgs84Distance } from '../wgs84.js';

export const SOPHIE_CHARLOTTE_SERVICE_AREA = Object.freeze({
  center: Object.freeze({ latitude: 52.510833, longitude: 13.296667 }),
  radiusMeters: 5000,
});

/**
 * Determine whether a point is inside an inclusive WGS84 circle.
 * @param {{point?: {latitude?: unknown, longitude?: unknown}, circle?: {center?: {latitude?: unknown, longitude?: unknown}, radiusMeters?: unknown}}} input Point and circle.
 * @returns {boolean} Whether the point is inside the circle.
 */
export function pointInsideWgs84Circle({ point, circle } = {}) {
  const pointCoordinates = coordinates(point);
  const centerCoordinates = coordinates(circle?.center);
  const radius = Number(circle?.radiusMeters);
  if (
    !pointCoordinates ||
    !centerCoordinates ||
    !Number.isFinite(radius) ||
    radius < 0
  )
    return false;
  return (
    wgs84Distance(
      centerCoordinates.latitude,
      centerCoordinates.longitude,
      pointCoordinates.latitude,
      pointCoordinates.longitude
    ) <= radius
  );
}

/**
 * Evaluate both normalized possession points against the injected service area.
 * @param {{deliveryPoint?: object, pickupPoint?: object, serviceArea?: object}} input Search points and service area.
 * @returns {{valid: true, feasible: boolean} | {valid: false, reason: string}} Spatial feasibility result.
 */
export function evaluateServiceAreaFeasibility({
  deliveryPoint,
  pickupPoint,
  serviceArea,
} = {}) {
  if (!validCircle(serviceArea))
    return { valid: false, reason: 'invalid-service-area' };
  if (!coordinates(deliveryPoint))
    return { valid: false, reason: 'invalid-delivery-location' };
  if (!coordinates(pickupPoint))
    return { valid: false, reason: 'invalid-pickup-location' };
  return {
    valid: true,
    feasible:
      pointInsideWgs84Circle({ point: deliveryPoint, circle: serviceArea }) &&
      pointInsideWgs84Circle({ point: pickupPoint, circle: serviceArea }),
  };
}

/**
 * Validate a service-area circle configuration.
 * @param {{center?: {latitude?: unknown, longitude?: unknown}, radiusMeters?: unknown}|undefined} circle Circle configuration.
 * @returns {boolean} Whether the circle is valid.
 */
function validCircle(circle) {
  return coordinates(circle?.center) &&
    Number.isFinite(Number(circle?.radiusMeters)) &&
    Number(circle?.radiusMeters) >= 0
    ? true
    : false;
}

/**
 * Normalize and validate WGS84 coordinates.
 * @param {{latitude?: unknown, longitude?: unknown}|undefined} point Point record.
 * @returns {{latitude: number, longitude: number}|null} Normalized coordinates or null.
 */
function coordinates(point) {
  if (!point) return null;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  return Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
    ? { latitude, longitude }
    : null;
}
