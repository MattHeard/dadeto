import { jest } from '@jest/globals';
import { createReferenceAssignmentList } from '../../../src/core/browser/toys/2026-08-20/assignmentRequests.js';

test('reference shape and path failures precede memory-policy resolution', () => {
  const resolveMemoryLocation = jest.fn(() => 'permanent');
  const list = createReferenceAssignmentList({
    keys: ['personId', 'segmentId'],
    missingMessage: 'Missing references.',
    resolveMemoryLocation,
  });
  expect(() => list.parseRequest('{}')).toThrow(
    'An assignment object is required.'
  );
  expect(() => list.parseRequest('{"assignment":{}}')).toThrow(
    'Missing references.'
  );
  expect(() =>
    list.parseRequest('{"assignment":{"personId":"P","segmentId":"S"}}')
  ).toThrow('A path is required.');
  expect(resolveMemoryLocation).not.toHaveBeenCalled();
  expect(
    list.parseRequest(
      '{"path":"items","assignment":{"personId":" P ","segmentId":" S "}}'
    )
  ).toEqual({
    memoryLocation: 'permanent',
    path: 'items',
    assignment: { personId: 'P', segmentId: 'S' },
  });
  expect(resolveMemoryLocation).toHaveBeenCalledTimes(1);
});
