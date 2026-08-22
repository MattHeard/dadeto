// Toy: Pickup Return Segment Proposal

/** @param {string} input JSON with possessionEndPoint, destination, travelDurationSeconds, endPointId, segmentId. @returns {string} Proposed point and segment. */
export function pickupReturnSegmentProposal(input) {
  try {
    const x = JSON.parse(input),
      start = x.possessionEndPoint,
      seconds = Number(x.travelDurationSeconds),
      destination = x.destination;
    const minutes = Math.ceil(seconds / 60);
    if (
      !start?.pointId ||
      !start.timestamp ||
      !destination ||
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      !x.endPointId ||
      !x.segmentId
    )
      throw new Error(
        'Valid possession point, destination, duration, and IDs are required.'
      );
    const point = {
      pointId: String(x.endPointId),
      latitude: Number(destination.latitude).toFixed(6),
      longitude: Number(destination.longitude).toFixed(6),
      timestamp: new Date(
        Date.parse(start.timestamp) + minutes * 60000
      ).toISOString(),
    };
    if (
      ![point.latitude, point.longitude].every(value => Number.isFinite(Number(value))) ||
      !Number.isFinite(Date.parse(point.timestamp))
    )
      throw new Error(
        'Valid destination coordinates and timestamp are required.'
      );
    return JSON.stringify({
      point,
      segment: {
        segmentId: String(x.segmentId),
        startPointId: String(start.pointId),
        endPointId: point.pointId,
      },
    });
  } catch (error) {
    return JSON.stringify({
      valid: false,
      error: error.message,
    });
  }
}
