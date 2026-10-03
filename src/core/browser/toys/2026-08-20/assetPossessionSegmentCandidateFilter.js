// @ts-nocheck
// Toy: Asset Possession Segment Candidate Filter
import {
  overlaps as overlap,
  isOrderedInterval,
} from './assignmentIntervals.js';
export { overlaps as overlap } from './assignmentIntervals.js';
import { runToyArrayCalculation } from '../formatToyError.js';

/**
 * Filter available assets for a possession interval.
 * @param {string} input JSON with assets, points, segments, assignments, requestedSku, possessionSegmentId.
 * @returns {string} Ordered candidate IDs.
 */
export function assetPossessionSegmentCandidateFilter(input) {
  return runToyArrayCalculation(() => collectCandidateIds(input));
}

/**
 * Calculate eligible candidate identifiers before serialization.
 * @param {string} input JSON request.
 * @returns {string[]} Ordered unique candidate identifiers.
 */
function collectCandidateIds(input) {
  const x = JSON.parse(input);
  const points = new Map((x.points || []).map(p => [p.pointId, p])),
    segments = new Map((x.segments || []).map(s => [s.segmentId, s]));
  const target = resolve(segments, points, x.possessionSegmentId),
    assignments = Array.isArray(x.existingAssetAssignments)
      ? x.existingAssetAssignments
      : x.assetAssignments || [];
  const ids = (x.assets || [])
    .filter(
      asset =>
        asset &&
        normalizeSku(asset.sku) === normalizeSku(x.requestedSku) &&
        asset.assetId &&
        !assignments.some(
          a =>
            a?.assetId === asset.assetId &&
            overlap(resolve(segments, points, a.segmentId), target)
        )
    )
    .map(asset => String(asset.assetId));
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/**
 * Normalize an SKU for exact comparisons.
 * @param {unknown} value Candidate SKU.
 * @returns {string} Trimmed SKU.
 */
export function normalizeSku(value) {
  return String(value).trim();
}
/**
 * Resolve a segment to its temporal interval.
 * @param {Map<string, {startPointId: string, endPointId: string}>} segments Segment registry.
 * @param {Map<string, {timestamp: string}>} points Point registry.
 * @param {string} id Segment identifier.
 * @returns {{startTime: number, endTime: number}} Resolved interval.
 */
export function resolve(segments, points, id) {
  const s = segments.get(id);
  if (!s) throw new Error('Unknown segment.');
  const a = points.get(s.startPointId),
    b = points.get(s.endPointId);
  if (!a || !b) throw new Error('Unknown point.');
  const startTime = Date.parse(a.timestamp),
    endTime = Date.parse(b.timestamp);
  if (!isOrderedInterval(startTime, endTime))
    throw new Error('Invalid interval.');
  return { startTime, endTime };
}
