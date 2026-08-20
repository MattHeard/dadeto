// Toy: Delivery Outbound Segment Proposal

/** @param {string} input JSON with possessionStartPoint, origin, travelDurationSeconds, startPointId, segmentId. @returns {string} Proposed point and segment. */
export function deliveryOutboundSegmentProposal(input) {
  try {
    const x = JSON.parse(input || '{}'),
      end = x.possessionStartPoint,
      seconds = Number(x.travelDurationSeconds),
      origin = x.origin;
    const minutes = Math.ceil(seconds / 60);
    if (
      !end?.pointId ||
      !end.timestamp ||
      !origin ||
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      !Number.isFinite(minutes) ||
      !x.startPointId ||
      !x.segmentId
    )
      throw new Error(
        'Valid possession point, origin, duration, and IDs are required.'
      );
    const point = {
      pointId: String(x.startPointId),
      latitude: Number(origin.latitude),
      longitude: Number(origin.longitude),
      timestamp: new Date(
        Date.parse(end.timestamp) - minutes * 60000
      ).toISOString(),
    };
    if (
      ![point.latitude, point.longitude].every(Number.isFinite) ||
      !Number.isFinite(Date.parse(point.timestamp))
    )
      throw new Error('Valid origin coordinates and timestamp are required.');
    return JSON.stringify({
      point,
      segment: {
        segmentId: String(x.segmentId),
        startPointId: point.pointId,
        endPointId: String(end.pointId),
      },
    });
  } catch (error) {
    return JSON.stringify({
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
