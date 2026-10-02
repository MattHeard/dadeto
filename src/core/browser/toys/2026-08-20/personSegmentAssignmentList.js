import {
  createReferenceAssignmentList,
  referenceMemoryLocation,
} from './assignmentRequests.js';

/** Configured personSegmentAssignmentList parsing and persistence operations. */
export const { parseRequest, append: personSegmentAssignmentList } =
  createReferenceAssignmentList({
    keys: ['personId', 'segmentId'],
    missingMessage: 'An assignment requires personId and segmentId.',
    resolveMemoryLocation: referenceMemoryLocation,
  });
