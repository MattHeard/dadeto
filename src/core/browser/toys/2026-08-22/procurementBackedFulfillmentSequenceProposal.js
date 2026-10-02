import {
  fulfillmentBoundary,
  fulfillmentSequenceResponse,
  fulfillmentPoint as point,
  fulfillmentSegment as segment,
  fulfillmentMinuteAligned as isMinuteTimestamp,
  fulfillmentNumberWithin as validCoordinate,
  fulfillmentConfiguredProposal,
  fulfillmentWarehouseSpacePoint,
  fulfillmentRecoverySegments,
  fulfillmentDistinctIds,
} from './fulfillmentResult.js';

// Toy: Procurement-Backed Fulfillment Sequence Proposal

/**
 * Propose a procurement-backed fulfillment sequence without persisting it.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export function procurementBackedFulfillmentSequenceProposal(input) {
  return fulfillmentBoundary(input, 'valid', request => {
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

    const warehouseSpacePoint = fulfillmentWarehouseSpacePoint(
      warehouse,
      ids.warehouseSpacePointId
    );
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
 * Validate and normalize the proposal request.
 * @param {any} request Request to validate.
 * @returns {any} Validated request.
 */
function validateRequest(request) {
  const prepared = fulfillmentConfiguredProposal(request);
  const {
    context: { segment, startPoint, endPoint },
    warehouse,
    travel,
    configuration,
    ids,
  } = prepared;
  const start = Date.parse(startPoint.timestamp);
  const end = Date.parse(endPoint.timestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    throw new Error('Possession timestamps must be valid and ordered.');
  if (
    !warehouse ||
    !validCoordinate(warehouse.latitude, -90, 90) ||
    !validCoordinate(warehouse.longitude, -180, 180)
  )
    throw new Error('Valid warehouse coordinates are required.');
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
  fulfillmentDistinctIds([...requiredPointIds, ...requiredSegmentIds], {
    segment,
    startPoint,
    endPoint,
  });
  if (!Object.values(pointIds).length || !Object.values(segmentIds).length)
    throw new Error('Generated point and segment IDs are required.');
  return prepared;
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
