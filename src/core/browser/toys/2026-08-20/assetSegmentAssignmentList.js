import { createReferenceAssignmentList } from './assignmentRequests.js';

/** Configured assetSegmentAssignmentList parsing and persistence operations. */
export const { parseRequest, append: assetSegmentAssignmentList } =
  createReferenceAssignmentList({
    keys: ['assetId', 'segmentId'],
    missingMessage: 'An assignment requires assetId and segmentId.',
  });
