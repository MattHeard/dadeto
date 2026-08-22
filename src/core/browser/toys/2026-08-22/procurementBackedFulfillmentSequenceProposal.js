import { normalizeCoordinate } from '../2026-08-18/registryUtils.js';

// Toy: Procurement-Backed Fulfillment Sequence Proposal

const MINUTE_MS = 60_000;

/**
 * Propose a procurement-backed fulfillment sequence without persisting it.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export function procurementBackedFulfillmentSequenceProposal(input) {
  try {
    const request = JSON.parse(input);
    const value = validateRequest(request);
    const { context, warehouse, travel, configuration, ids } = value;
    const possessionStart = Date.parse(context.startPoint.timestamp);
    const possessionEnd = Date.parse(context.endPoint.timestamp);
    const deliveryAllocated =
      travel.deliveryOutboundSeconds + configuration.deliveryBuffer;
    const procurementAllocated =
      configuration.procurementDuration + configuration.procurementBuffer;
    const pickupAllocated =
      travel.pickupReturnSeconds + configuration.pickupBuffer;
    const inspectionAllocated =
      configuration.inspectionDuration + configuration.inspectionBuffer;
    const cleaningAllocated =
      configuration.cleaningDuration + configuration.cleaningBuffer;
    const deliveryStart = possessionStart - deliveryAllocated * 1000;
    const procurementStart = deliveryStart - procurementAllocated * 1000;
    const pickupEnd = possessionEnd + pickupAllocated * 1000;
    const inspectionEnd = pickupEnd + inspectionAllocated * 1000;
    const cleaningEnd = inspectionEnd + cleaningAllocated * 1000;
    const timestamps = [
      procurementStart,
      deliveryStart,
      possessionStart,
      possessionEnd,
      pickupEnd,
      inspectionEnd,
      cleaningEnd,
    ];
    if (timestamps.some(timestamp => !isMinuteTimestamp(timestamp)))
      throw new Error('All resulting timestamps must align to whole minutes.');

    const warehouseSpacePoint = {
      spacePointId: ids.warehouseSpacePointId,
      latitude: normalizeCoordinate(warehouse.latitude, -90, 90),
      longitude: normalizeCoordinate(warehouse.longitude, -180, 180),
    };
    const points = [
      point(
        ids.points.procurementStart,
        ids.warehouseSpacePointId,
        procurementStart
      ),
      point(ids.points.stockReady, ids.warehouseSpacePointId, deliveryStart),
      context.startPoint,
      context.endPoint,
      point(ids.points.pickupReturn, ids.warehouseSpacePointId, pickupEnd),
      point(
        ids.points.inspectionComplete,
        ids.warehouseSpacePointId,
        inspectionEnd
      ),
      point(
        ids.points.cleaningComplete,
        ids.warehouseSpacePointId,
        cleaningEnd
      ),
    ];
    const segments = [
      segment(
        ids.segments.procurement,
        ids.points.procurementStart,
        ids.points.stockReady
      ),
      segment(
        ids.segments.deliveryOutbound,
        ids.points.stockReady,
        context.startPoint.pointId
      ),
      context.segment,
      segment(
        ids.segments.pickupReturn,
        context.endPoint.pointId,
        ids.points.pickupReturn
      ),
      segment(
        ids.segments.inspection,
        ids.points.pickupReturn,
        ids.points.inspectionComplete
      ),
      segment(
        ids.segments.cleaning,
        ids.points.inspectionComplete,
        ids.points.cleaningComplete
      ),
    ];
    const sequence = [
      operation({
        operationName: 'procurement',
        segmentId: ids.segments.procurement,
        baseDurationSeconds: configuration.procurementDuration,
        bufferSeconds: configuration.procurementBuffer,
        allocatedDurationSeconds: procurementAllocated,
      }),
      operation({
        operationName: 'delivery-outbound',
        segmentId: ids.segments.deliveryOutbound,
        baseDurationSeconds: travel.deliveryOutboundSeconds,
        bufferSeconds: configuration.deliveryBuffer,
        allocatedDurationSeconds: deliveryAllocated,
      }),
      { operation: 'possession', segmentId: context.segment.segmentId },
      operation({
        operationName: 'pickup-return',
        segmentId: ids.segments.pickupReturn,
        baseDurationSeconds: travel.pickupReturnSeconds,
        bufferSeconds: configuration.pickupBuffer,
        allocatedDurationSeconds: pickupAllocated,
      }),
      operation({
        operationName: 'inspection',
        segmentId: ids.segments.inspection,
        baseDurationSeconds: configuration.inspectionDuration,
        bufferSeconds: configuration.inspectionBuffer,
        allocatedDurationSeconds: inspectionAllocated,
      }),
      operation({
        operationName: 'cleaning',
        segmentId: ids.segments.cleaning,
        baseDurationSeconds: configuration.cleaningDuration,
        bufferSeconds: configuration.cleaningBuffer,
        allocatedDurationSeconds: cleaningAllocated,
      }),
    ];
    return JSON.stringify({
      spacePoints: [warehouseSpacePoint],
      points,
      segments,
      sequence,
      possessionContext: { segmentId: context.segment.segmentId },
    });
  } catch (error) {
    return JSON.stringify({ valid: false, error: error.message });
  }
}

/**
 * Validate and normalize the proposal request.
 * @param {any} request Request to validate.
 * @returns {any} Validated request.
 */
function validateRequest(request) {
  const context = request?.possessionContext;
  const segment = context?.segment;
  const startPoint = context?.startPoint;
  const endPoint = context?.endPoint;
  if (!segment || !startPoint || !endPoint)
    throw new Error(
      'A possession segment and both endpoint points are required.'
    );
  if (
    segment.startPointId !== startPoint.pointId ||
    segment.endPointId !== endPoint.pointId
  )
    throw new Error(
      'Possession segment endpoint references must match its points.'
    );
  const start = Date.parse(startPoint.timestamp);
  const end = Date.parse(endPoint.timestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    throw new Error('Possession timestamps must be valid and ordered.');
  const warehouse = request.warehouse;
  if (
    !warehouse ||
    !validCoordinate(warehouse.latitude, -90, 90) ||
    !validCoordinate(warehouse.longitude, -180, 180)
  )
    throw new Error('Valid warehouse coordinates are required.');
  const travel = request.travelDurations;
  const configuration = request.configuration;
  const durationValues = [
    travel?.deliveryOutboundSeconds,
    travel?.pickupReturnSeconds,
    ...[
      'procurementDuration',
      'procurementBuffer',
      'deliveryBuffer',
      'pickupBuffer',
      'inspectionDuration',
      'inspectionBuffer',
      'cleaningDuration',
      'cleaningBuffer',
    ].map(key => configuration?.[key]),
  ];
  durationValues.forEach(value => {
    if (!Number.isFinite(value) || value < 0)
      throw new Error('Durations must be finite and non-negative.');
  });
  const ids = request.generatedIds;
  const pointIds = ids?.points;
  const segmentIds = ids?.segments;
  const requiredPointIds = [
    ids?.warehouseSpacePointId,
    ...Object.values(pointIds || {}),
  ];
  const requiredSegmentIds = [...Object.values(segmentIds || {})];
  if (
    [...requiredPointIds, ...requiredSegmentIds].some(
      id => typeof id !== 'string' || !id.trim()
    )
  )
    throw new Error('All generated IDs are required.');
  const allIds = [
    ...requiredPointIds,
    ...requiredSegmentIds,
    segment.segmentId,
    startPoint.pointId,
    endPoint.pointId,
  ];
  if (new Set(allIds).size !== allIds.length)
    throw new Error(
      'Generated IDs must be unique and distinct from possession IDs.'
    );
  if (!Object.values(pointIds).length || !Object.values(segmentIds).length)
    throw new Error('Generated point and segment IDs are required.');
  return {
    context: { segment, startPoint, endPoint },
    warehouse,
    travel,
    configuration,
    ids,
  };
}

/**
 * Validate a WGS84 coordinate.
 * @param {unknown} value Candidate coordinate.
 * @param {number} minimum Lower bound.
 * @param {number} maximum Upper bound.
 * @returns {boolean} Whether valid.
 */
function validCoordinate(value, minimum, maximum) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

/**
 * Check the repository's minute timestamp precision.
 * @param {number} value Epoch milliseconds.
 * @returns {boolean} Whether minute aligned.
 */
function isMinuteTimestamp(value) {
  return Number.isFinite(value) && value % MINUTE_MS === 0;
}

/**
 * Create a referenced spacetime point.
 * @param {string} pointId Point ID.
 * @param {string} spacePointId Space-point ID.
 * @param {number} timestamp Epoch milliseconds.
 * @returns {object} Point record.
 */
function point(pointId, spacePointId, timestamp) {
  return {
    pointId,
    spacePointId,
    timestamp: `${new Date(timestamp).toISOString().slice(0, 16)}Z`,
  };
}

/**
 * Create a segment reference.
 * @param {string} segmentId Segment ID.
 * @param {string} startPointId Start point ID.
 * @param {string} endPointId End point ID.
 * @returns {object} Segment record.
 */
function segment(segmentId, startPointId, endPointId) {
  return { segmentId, startPointId, endPointId };
}

/**
 * Create operation metadata.
 * @param {{operationName: string, segmentId: string, baseDurationSeconds: number, bufferSeconds: number, allocatedDurationSeconds: number}} value Operation values.
 * @returns {object} Operation record.
 */
function operation({
  operationName,
  segmentId,
  baseDurationSeconds,
  bufferSeconds,
  allocatedDurationSeconds,
}) {
  return {
    operation: operationName,
    segmentId,
    baseDurationSeconds,
    bufferSeconds,
    allocatedDurationSeconds,
  };
}
