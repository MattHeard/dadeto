import { createAssignmentPredicate } from './assignmentRequests.js';

// Asset references require plain objects and use one collection diagnostic.
const collectionError =
  'points, segments, and assignments arrays are required.';
export const {
  parseRequest,
  normalizeAssignment,
  evaluate: assetSegmentAssignmentPredicate,
  resolveInterval,
  overlaps,
} = createAssignmentPredicate({
  ownerKey: 'assetId',
  strictReferences: true,
  requestError: 'Input must be a JSON object.',
  collectionErrors: {
    points: collectionError,
    segments: collectionError,
    assignments: collectionError,
  },
});
