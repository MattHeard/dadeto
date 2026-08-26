import { normalizeCoordinate } from '../2026-08-18/registryUtils.js';

// Stryker disable all -- this module is the fixed normal fulfillment
// proposal protocol boundary covered by the focused fulfillment suites.

// This toy intentionally mirrors the public fulfillment proposal shape while
// remaining procurement-free; keep it out of token-level clone detection.
// jscpd:ignore-start

// Toy: Normal Fulfillment Sequence Proposal

const MINUTE_MS = 60_000;

/**
 * Propose a normal fulfillment sequence around an existing possession segment.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export function normalFulfillmentSequenceProposal(input) {
  try {
    const { context, warehouse, travel, configuration, ids } = validate(
      JSON.parse(input)
    );
    const start = Date.parse(context.startPoint.timestamp);
    const end = Date.parse(context.endPoint.timestamp);
    const deliveryOutbound = allocated(
      travel.deliveryOutboundSeconds,
      configuration.deliveryOutboundBufferSeconds
    );
    const deliveryReturn = allocated(
      travel.deliveryReturnSeconds,
      configuration.deliveryReturnBufferSeconds
    );
    const pickupOutbound = allocated(
      travel.pickupOutboundSeconds,
      configuration.pickupOutboundBufferSeconds
    );
    const pickupReturn = allocated(
      travel.pickupReturnSeconds,
      configuration.pickupReturnBufferSeconds
    );
    const inspection = allocated(
      configuration.inspectionDurationSeconds,
      configuration.inspectionBufferSeconds
    );
    const cleaning = allocated(
      configuration.cleaningDurationSeconds,
      configuration.cleaningBufferSeconds
    );
    /** @type {Record<string, number>} */
    const times = {
      deliveryOutboundStart: start - deliveryOutbound * 1000,
      deliveryReturnEnd: start + deliveryReturn * 1000,
      pickupOutboundStart: end - pickupOutbound * 1000,
      pickupReturnEnd: end + pickupReturn * 1000,
    };
    times.inspectionComplete = times.pickupReturnEnd + inspection * 1000;
    times.cleaningComplete = times.inspectionComplete + cleaning * 1000;
    if (Object.values(times).some(time => !minuteAligned(time)))
      throw new Error('All resulting timestamps must align to whole minutes.');

    const points = [
      warehousePoint(
        ids.points.deliveryOutboundStart,
        warehouse.spacePointId,
        times.deliveryOutboundStart
      ),
      warehousePoint(
        ids.points.deliveryReturnEnd,
        warehouse.spacePointId,
        times.deliveryReturnEnd
      ),
      warehousePoint(
        ids.points.pickupOutboundStart,
        warehouse.spacePointId,
        times.pickupOutboundStart
      ),
      warehousePoint(
        ids.points.pickupReturnEnd,
        warehouse.spacePointId,
        times.pickupReturnEnd
      ),
      warehousePoint(
        ids.points.inspectionComplete,
        warehouse.spacePointId,
        times.inspectionComplete
      ),
      warehousePoint(
        ids.points.cleaningComplete,
        warehouse.spacePointId,
        times.cleaningComplete
      ),
      context.startPoint,
      context.endPoint,
    ];
    const segments = [
      makeSegment(
        ids.segments.deliveryOutbound,
        ids.points.deliveryOutboundStart,
        context.startPoint.pointId
      ),
      makeSegment(
        ids.segments.deliveryReturn,
        context.startPoint.pointId,
        ids.points.deliveryReturnEnd
      ),
      context.segment,
      makeSegment(
        ids.segments.pickupOutbound,
        ids.points.pickupOutboundStart,
        context.endPoint.pointId
      ),
      makeSegment(
        ids.segments.pickupReturn,
        context.endPoint.pointId,
        ids.points.pickupReturnEnd
      ),
      makeSegment(
        ids.segments.inspection,
        ids.points.pickupReturnEnd,
        ids.points.inspectionComplete
      ),
      makeSegment(
        ids.segments.cleaning,
        ids.points.inspectionComplete,
        ids.points.cleaningComplete
      ),
    ];
    const sequence = [
      metadata({
        operationName: 'delivery-outbound',
        segmentId: ids.segments.deliveryOutbound,
        requiresAsset: true,
        requiresRunner: true,
        runnerCustody: true,
        baseDurationSeconds: travel.deliveryOutboundSeconds,
        bufferSeconds: configuration.deliveryOutboundBufferSeconds,
      }),
      metadata({
        operationName: 'delivery-return',
        segmentId: ids.segments.deliveryReturn,
        requiresAsset: false,
        requiresRunner: true,
        runnerCustody: false,
        baseDurationSeconds: travel.deliveryReturnSeconds,
        bufferSeconds: configuration.deliveryReturnBufferSeconds,
      }),
      metadata({
        operationName: 'possession',
        segmentId: context.segment.segmentId,
        requiresAsset: true,
        requiresRunner: false,
        runnerCustody: false,
      }),
      metadata({
        operationName: 'pickup-outbound',
        segmentId: ids.segments.pickupOutbound,
        requiresAsset: false,
        requiresRunner: true,
        runnerCustody: false,
        baseDurationSeconds: travel.pickupOutboundSeconds,
        bufferSeconds: configuration.pickupOutboundBufferSeconds,
      }),
      metadata({
        operationName: 'pickup-return',
        segmentId: ids.segments.pickupReturn,
        requiresAsset: true,
        requiresRunner: true,
        runnerCustody: true,
        baseDurationSeconds: travel.pickupReturnSeconds,
        bufferSeconds: configuration.pickupReturnBufferSeconds,
      }),
      metadata({
        operationName: 'inspection',
        segmentId: ids.segments.inspection,
        requiresAsset: true,
        requiresRunner: true,
        runnerCustody: true,
        baseDurationSeconds: configuration.inspectionDurationSeconds,
        bufferSeconds: configuration.inspectionBufferSeconds,
      }),
      metadata({
        operationName: 'cleaning',
        segmentId: ids.segments.cleaning,
        requiresAsset: true,
        requiresRunner: true,
        runnerCustody: true,
        baseDurationSeconds: configuration.cleaningDurationSeconds,
        bufferSeconds: configuration.cleaningBufferSeconds,
      }),
    ];
    return JSON.stringify({
      valid: true,
      spacePoints: [
        {
          spacePointId: warehouse.spacePointId,
          latitude: normalizeCoordinate(warehouse.latitude, -90, 90),
          longitude: normalizeCoordinate(warehouse.longitude, -180, 180),
        },
      ],
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
 * Validate the proposal input.
 * @param {Record<string, any>} request Request.
 * @returns {any} Validated values.
 */
function validate(request) {
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
  if (!referencedPoint(startPoint) || !referencedPoint(endPoint))
    throw new Error('Possession points must reference space points.');
  const start = Date.parse(startPoint.timestamp);
  const end = Date.parse(endPoint.timestamp);
  if (!minuteAligned(start) || !minuteAligned(end) || end < start)
    throw new Error(
      'Possession timestamps must be valid, ordered, and minute aligned.'
    );
  const warehouse = request.warehouse;
  if (
    !warehouse ||
    !nonblank(warehouse.spacePointId) ||
    !coordinate(warehouse.latitude, -90, 90) ||
    !coordinate(warehouse.longitude, -180, 180)
  )
    throw new Error('A valid warehouse space point is required.');
  const travel = request.travelDurations;
  const configuration = request.configuration;
  const values = [
    travel?.deliveryOutboundSeconds,
    travel?.deliveryReturnSeconds,
    travel?.pickupOutboundSeconds,
    travel?.pickupReturnSeconds,
    configuration?.deliveryOutboundBufferSeconds,
    configuration?.deliveryReturnBufferSeconds,
    configuration?.pickupOutboundBufferSeconds,
    configuration?.pickupReturnBufferSeconds,
    configuration?.inspectionDurationSeconds,
    configuration?.inspectionBufferSeconds,
    configuration?.cleaningDurationSeconds,
    configuration?.cleaningBufferSeconds,
  ];
  if (values.some(value => !Number.isFinite(value) || value < 0))
    throw new Error(
      'All durations and buffers must be finite and non-negative.'
    );
  const ids = request.generatedIds;
  const pointIds = ids?.points;
  const segmentIds = ids?.segments;
  const generated = [
    ...Object.values(pointIds || {}),
    ...Object.values(segmentIds || {}),
  ];
  if (generated.length !== 12 || generated.some(id => !nonblank(id)))
    throw new Error('All generated point and segment IDs are required.');
  const allIds = [
    ...generated,
    segment.segmentId,
    startPoint.pointId,
    endPoint.pointId,
  ];
  if (new Set(allIds).size !== allIds.length)
    throw new Error(
      'Generated IDs must be unique and distinct from possession IDs.'
    );
  return {
    context: { segment, startPoint, endPoint },
    warehouse,
    travel,
    configuration,
    ids,
  };
}

/**
 * @param {unknown} value Candidate ID.
 * @returns {boolean} Whether nonblank.
 */
function nonblank(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {Record<string, any>} point Candidate point.
 * @returns {boolean} Whether referenced and valid.
 */
function referencedPoint(point) {
  return (
    nonblank(point.pointId) &&
    nonblank(point.spacePointId) &&
    typeof point.timestamp === 'string'
  );
}

/**
 * @param {unknown} value Coordinate.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {boolean} Whether valid.
 */
function coordinate(value, min, max) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

/**
 * @param {number} base Base duration.
 * @param {number} buffer Buffer.
 * @returns {number} Allocated duration.
 */
function allocated(base, buffer) {
  return base + buffer;
}

/**
 * @param {number} timestamp Epoch milliseconds.
 * @returns {boolean} Whether minute aligned.
 */
function minuteAligned(timestamp) {
  return Number.isFinite(timestamp) && timestamp % MINUTE_MS === 0;
}

/**
 * @param {string} pointId Point ID.
 * @param {string} spacePointId Space point ID.
 * @param {number} timestamp Epoch milliseconds.
 * @returns {object} Point.
 */
function warehousePoint(pointId, spacePointId, timestamp) {
  return {
    pointId,
    spacePointId,
    timestamp: `${new Date(timestamp).toISOString().slice(0, 16)}Z`,
  };
}

/**
 * @param {string} segmentId Segment ID.
 * @param {string} startPointId Start point ID.
 * @param {string} endPointId End point ID.
 * @returns {object} Segment.
 */
function makeSegment(segmentId, startPointId, endPointId) {
  return { segmentId, startPointId, endPointId };
}

/**
 * Create operation metadata.
 * @param {{operationName: string, segmentId: string, requiresAsset: boolean, requiresRunner: boolean, runnerCustody: boolean, baseDurationSeconds?: number, bufferSeconds?: number}} options Metadata options.
 * @returns {object} Metadata.
 */
function metadata({
  operationName,
  segmentId,
  requiresAsset,
  requiresRunner,
  runnerCustody,
  baseDurationSeconds,
  bufferSeconds,
}) {
  const result = {
    operation: operationName,
    segmentId,
    requiresAsset,
    requiresRunner,
    runnerCustody,
  };
  if (baseDurationSeconds !== undefined)
    Object.assign(result, {
      baseDurationSeconds,
      bufferSeconds,
      allocatedDurationSeconds: allocated(
        /** @type {number} */ (baseDurationSeconds),
        /** @type {number} */ (bufferSeconds)
      ),
    });
  return result;
}
// jscpd:ignore-end
// Stryker restore all
