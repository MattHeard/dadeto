// Shared normal and procurement-backed fulfillment sequences.
import {
  fulfillmentProposalBoundary,
  fulfillmentBoundary,
  fulfillmentSequenceResponse,
  fulfillmentNonblankString as nonblank,
  fulfillmentMinuteAligned as minuteAligned,
  fulfillmentPoint as warehousePoint,
  fulfillmentSegment as makeSegment,
  fulfillmentNumberWithin as coordinate,
  fulfillmentConfiguredProposal,
  fulfillmentWarehouseSpacePoint,
  fulfillmentRecoverySegments,
  fulfillmentDistinctIds,
} from './fulfillmentResult.js';

const NORMAL_CHECKS = [
  checkNormalPossession,
  checkNormalWarehouse,
  checkNormalDurations,
  checkNormalIds,
];
const PROCUREMENT_CHECKS = [
  checkProcurementPossession,
  checkProcurementWarehouse,
  checkProcurementDurations,
  checkProcurementIds,
];

/**
 * Propose a normal fulfillment sequence around an existing possession segment.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export function normalFulfillmentSequenceProposal(input) {
  return fulfillmentProposalBoundary(input, buildNormalSequence);
}

/**
 * Assemble delivery and recovery records from the parsed proposal.
 * @param {Record<string, any>} request Parsed normal sequence request.
 * @returns {string} Complete authored sequence JSON.
 */
function buildNormalSequence(request) {
  const { context, warehouse, travel, configuration, ids } = validateSequence(
    request,
    NORMAL_CHECKS
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
    ...fulfillmentRecoverySegments(ids, ids.points.pickupReturnEnd),
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
  return fulfillmentSequenceResponse(
    fulfillmentWarehouseSpacePoint(warehouse),
    { points, segments, sequence },
    context.segment.segmentId,
    { valid: true }
  );
}

/**
 * Validate referenced possession points before their minute precision.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkNormalPossession(prepared) {
  const { context } = prepared;
  if (
    !referencedPoint(context.startPoint) ||
    !referencedPoint(context.endPoint)
  )
    throw new Error('Possession points must reference space points.');
  validateOrderedPossession(
    context,
    minuteAligned,
    'Possession timestamps must be valid, ordered, and minute aligned.'
  );
}

/**
 * Require an identified warehouse before checking its coordinates.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkNormalWarehouse(prepared) {
  const { warehouse } = prepared;
  if (!warehouse || !nonblank(warehouse.spacePointId))
    throw new Error('A valid warehouse space point is required.');
  validateWarehouseCoordinates(
    warehouse,
    'A valid warehouse space point is required.'
  );
}

/**
 * Retain the normal proposal duration and buffer ordering.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkNormalDurations(prepared) {
  const { travel, configuration } = prepared;
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
}

/**
 * Require twelve distinct generated normal-sequence identifiers.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkNormalIds(prepared) {
  const { ids, context } = prepared;
  const pointIds = ids?.points;
  const segmentIds = ids?.segments;
  const generated = [
    ...Object.values(pointIds || {}),
    ...Object.values(segmentIds || {}),
  ];
  if (generated.length !== 12 || generated.some(id => !nonblank(id)))
    throw new Error('All generated point and segment IDs are required.');
  fulfillmentDistinctIds(generated, context);
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
 * @param {number} base Base duration.
 * @param {number} buffer Buffer.
 * @returns {number} Allocated duration.
 */
function allocated(base, buffer) {
  return base + buffer;
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

/**
 * Propose a procurement-backed fulfillment sequence without persisting it.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export function procurementBackedFulfillmentSequenceProposal(input) {
  return fulfillmentBoundary(input, 'valid', request => {
    const value = validateSequence(request, PROCUREMENT_CHECKS);
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
    if (timestamps.some(timestamp => !minuteAligned(timestamp)))
      throw new Error('All resulting timestamps must align to whole minutes.');

    const warehouseSpacePoint = fulfillmentWarehouseSpacePoint(
      warehouse,
      ids.warehouseSpacePointId
    );
    const points = [
      warehousePoint(
        ids.points.procurementStart,
        ids.warehouseSpacePointId,
        procurementStart
      ),
      warehousePoint(
        ids.points.stockReady,
        ids.warehouseSpacePointId,
        deliveryStart
      ),
      context.startPoint,
      context.endPoint,
      warehousePoint(
        ids.points.pickupReturn,
        ids.warehouseSpacePointId,
        pickupEnd
      ),
      warehousePoint(
        ids.points.inspectionComplete,
        ids.warehouseSpacePointId,
        inspectionEnd
      ),
      warehousePoint(
        ids.points.cleaningComplete,
        ids.warehouseSpacePointId,
        cleaningEnd
      ),
    ];
    const segments = [
      makeSegment(
        ids.segments.procurement,
        ids.points.procurementStart,
        ids.points.stockReady
      ),
      makeSegment(
        ids.segments.deliveryOutbound,
        ids.points.stockReady,
        context.startPoint.pointId
      ),
      context.segment,
      makeSegment(
        ids.segments.pickupReturn,
        context.endPoint.pointId,
        ids.points.pickupReturn
      ),
      ...fulfillmentRecoverySegments(ids, ids.points.pickupReturn),
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
    return fulfillmentSequenceResponse(
      warehouseSpacePoint,
      { points, segments, sequence },
      context.segment.segmentId
    );
  });
}

// Procurement-backed proposals finish at the serialization boundary.

/**
 * Retain the procurement proposal's finite ordered timestamp policy.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkProcurementPossession(prepared) {
  validateOrderedPossession(
    prepared.context,
    Number.isFinite,
    'Possession timestamps must be valid and ordered.'
  );
}

/**
 * Require warehouse coordinates without imposing a spatial ID.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkProcurementWarehouse(prepared) {
  validateWarehouseCoordinates(
    prepared.warehouse,
    'Valid warehouse coordinates are required.'
  );
}

/**
 * Validate procurement durations in the original field order.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkProcurementDurations(prepared) {
  const { travel, configuration } = prepared;
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
}

/**
 * Retain procurement ID validation, collisions and collection checks.
 * @param {Record<string, any>} prepared Prepared proposal.
 * @returns {void} Throws at the first invalid field.
 */
function checkProcurementIds(prepared) {
  const { ids, context } = prepared;
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
  fulfillmentDistinctIds([...requiredPointIds, ...requiredSegmentIds], context);
  if (!Object.values(pointIds).length || !Object.values(segmentIds).length)
    throw new Error('Generated point and segment IDs are required.');
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
}) {
  return metadata({
    operationName,
    segmentId,
    requiresAsset: false,
    requiresRunner: false,
    runnerCustody: false,
    baseDurationSeconds,
    bufferSeconds,
  });
}

/** @typedef {ReturnType<typeof fulfillmentConfiguredProposal> & {ids: {points: Record<string, string>, segments: Record<string, string>}}} ValidatedSequence */

/**
 * Prepare once, then apply caller-specific validation stages in their authored order.
 * @param {Record<string, any>} request Parsed proposal.
 * @param {Array<(prepared: ReturnType<typeof fulfillmentConfiguredProposal>) => void>} checks Ordered checks.
 * @returns {ValidatedSequence} Validated proposal configuration.
 */
function validateSequence(request, checks) {
  const prepared = fulfillmentConfiguredProposal(request);
  for (const check of checks) check(prepared);
  return /** @type {ValidatedSequence} */ (prepared);
}

/**
 * Require ordered timestamps with caller-specific precision and error policy.
 * @param {{startPoint: Record<string, any>, endPoint: Record<string, any>}} context Possession endpoints.
 * @param {(timestamp: number) => boolean} valid Timestamp policy.
 * @param {string} message Original rejection message.
 * @returns {void} Throws for invalid or reversed timestamps.
 */
function validateOrderedPossession(context, valid, message) {
  const start = Date.parse(context.startPoint.timestamp);
  const end = Date.parse(context.endPoint.timestamp);
  if (!valid(start) || !valid(end) || end < start) throw new Error(message);
}

/**
 * Validate numeric warehouse coordinates after caller-specific identity checks.
 * @param {Record<string, any>} warehouse Warehouse configuration.
 * @param {string} message Original rejection message.
 * @returns {void} Throws for missing or invalid coordinates.
 */
function validateWarehouseCoordinates(warehouse, message) {
  if (
    !warehouse ||
    !coordinate(warehouse.latitude, -90, 90) ||
    !coordinate(warehouse.longitude, -180, 180)
  )
    throw new Error(message);
}
