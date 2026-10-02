import {
  createReferenceAssignmentList,
  referenceMemoryLocation,
} from './assignmentRequests.js';

/** Configured assetCustodianSegmentAssignmentList parsing and persistence operations. */
export const { parseRequest, append: assetCustodianSegmentAssignmentList } =
  createReferenceAssignmentList({
    keys: ['assetId', 'segmentId', 'custodianPersonId'],
    missingMessage:
      'An assignment requires assetId, segmentId, and custodianPersonId.',
    resolveMemoryLocation: referenceMemoryLocation,
  });
