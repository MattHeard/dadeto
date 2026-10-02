const DIRECTIONS = {
  delivery: {
    anchor: 'possessionStartPoint',
    location: 'origin',
    pointId: 'startPointId',
    offset: -1,
  },
  pickup: {
    anchor: 'possessionEndPoint',
    location: 'destination',
    pointId: 'endPointId',
    offset: 1,
  },
};

/**
 * Build a delivery or pickup leg at the minute-rounded possession boundary.
 * @param {string} input Serialized travel request.
 * @param {'delivery' | 'pickup'} direction Leg orientation.
 * @returns {string} Serialized point and directed segment, or failure.
 */
export function travelSegmentProposal(input, direction) {
  try {
    const request = JSON.parse(input);
    const configuration = DIRECTIONS[direction];
    const anchor = request[configuration.anchor];
    const location = request[configuration.location];
    const seconds = Number(request.travelDurationSeconds);
    if (
      !anchor?.pointId ||
      !anchor.timestamp ||
      !location ||
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      !request[configuration.pointId] ||
      !request.segmentId
    ) {
      throw new Error(
        `Valid possession point, ${configuration.location}, duration, and IDs are required.`
      );
    }
    const point = createTravelPoint(request, configuration, seconds);
    const endpoints = [point.pointId, String(anchor.pointId)];
    if (configuration.offset > 0) endpoints.reverse();
    return JSON.stringify({
      point,
      segment: {
        segmentId: String(request.segmentId),
        startPointId: endpoints[0],
        endPointId: endpoints[1],
      },
    });
  } catch (error) {
    return JSON.stringify({ valid: false, error: error.message });
  }
}

/**
 * Create a coordinate-bearing point on the selected side of possession.
 * @param {Record<string, any>} request Travel request.
 * @param {{anchor: string, location: string, pointId: string, offset: number}} configuration Direction fields.
 * @param {number} seconds Non-negative duration.
 * @returns {{pointId: string, latitude: string, longitude: string, timestamp: string}} Travel endpoint.
 */
function createTravelPoint(request, configuration, seconds) {
  const location = request[configuration.location];
  const point = {
    pointId: String(request[configuration.pointId]),
    latitude: Number(location.latitude).toFixed(6),
    longitude: Number(location.longitude).toFixed(6),
    timestamp: new Date(
      Date.parse(request[configuration.anchor].timestamp) +
        configuration.offset * Math.ceil(seconds / 60) * 60000
    ).toISOString(),
  };
  if (
    ![point.latitude, point.longitude].every(value =>
      Number.isFinite(Number(value))
    ) ||
    !Number.isFinite(Date.parse(point.timestamp))
  ) {
    throw new Error(
      `Valid ${configuration.location} coordinates and timestamp are required.`
    );
  }
  return point;
}
