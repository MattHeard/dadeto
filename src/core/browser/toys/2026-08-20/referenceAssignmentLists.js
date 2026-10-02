import {
  createReferenceAssignmentList,
  referenceMemoryLocation,
} from './assignmentRequests.js';

/** Reference assignment configuration for assetSegmentAssignmentList. */
export const {
  parseRequest: assetSegmentAssignmentListParser,
  append: assetSegmentAssignmentList,
} = createReferenceAssignmentList({
  keys: ['assetId', 'segmentId'],
  missingMessage: 'An assignment requires assetId and segmentId.',
});

/** Reference assignment configuration for personSegmentAssignmentList. */
export const {
  parseRequest: personSegmentAssignmentListParser,
  append: personSegmentAssignmentList,
} = createReferenceAssignmentList({
  keys: ['personId', 'segmentId'],
  missingMessage: 'An assignment requires personId and segmentId.',
  resolveMemoryLocation: referenceMemoryLocation,
});

/** Reference assignment configuration for assetCustodianSegmentAssignmentList. */
export const {
  parseRequest: assetCustodianSegmentAssignmentListParser,
  append: assetCustodianSegmentAssignmentList,
} = createReferenceAssignmentList({
  keys: ['assetId', 'segmentId', 'custodianPersonId'],
  missingMessage:
    'An assignment requires assetId, segmentId, and custodianPersonId.',
  resolveMemoryLocation: referenceMemoryLocation,
});
