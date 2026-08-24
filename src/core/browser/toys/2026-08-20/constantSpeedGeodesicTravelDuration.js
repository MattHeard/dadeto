// Toy: Constant-Speed Geodesic Travel Duration
import { wgs84Distance } from './wgs84Distance.js';
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';

/**
 * Calculate travel duration for a constant-speed segment.
 * @param {string} input JSON with points, segment, and speedKilometersPerHour.
 * @returns {string} Scalar seconds object.
 */
export function constantSpeedGeodesicTravelDuration(input) {
  try {
    const x = JSON.parse(input);
    if (!x || !Array.isArray(x.points) || !x.segment)
      throw new Error('Valid segment points and positive speed are required.');
    const points = new Map(
        resolvePointRecords(x.points, x.spacePoints).map(p => [p.pointId, p])
      ),
      s = x.segment;
    const a = points.get(s.startPointId),
      b = points.get(s.endPointId),
      speed = Number(x.speedKilometersPerHour);
    if (!a || !b || !Number.isFinite(speed) || speed <= 0)
      throw new Error('Valid segment points and positive speed are required.');
    const distance = wgs84Distance(
      Number(a.latitude),
      Number(a.longitude),
      Number(b.latitude),
      Number(b.longitude)
    );
    if (
      ![a.latitude, a.longitude, b.latitude, b.longitude].every(value =>
        Number.isFinite(Number(value))
      )
    )
      throw new Error('Valid coordinates are required.');
    return JSON.stringify({
      value: String((distance / 1000 / speed) * 3600),
      unit: 'seconds',
    });
  } catch (error) {
    return JSON.stringify({
      valid: false,
      error: error.message,
    });
  }
}
