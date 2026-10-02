import { createAssignmentPredicate } from './assignmentRequests.js';

// Person references accept non-array records and identify missing collections.
export const {
  evaluate: personSegmentAssignmentPredicate,
  parseRequest,
  normalizeAssignment,
  resolveInterval,
  overlaps,
} = createAssignmentPredicate({
  ownerKey: 'personId',
  strictReferences: false,
  requestError: 'points, segments, and assignments arrays are required.',
  collectionErrors: {
    points: 'points array is required.',
    segments: 'segments array is required.',
    assignments: 'assignments array is required.',
  },
});
