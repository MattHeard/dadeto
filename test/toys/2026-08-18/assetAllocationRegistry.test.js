import { describe, expect, test } from '@jest/globals';
import { assetAllocationRegistry } from '../../../src/core/browser/toys/2026-08-18/assetAllocationRegistry.js';

describe('assetAllocationRegistry', () => {
  test('registers full transport-inclusive allocation windows', () => {
    const result = JSON.parse(
      assetAllocationRegistry(
        JSON.stringify({
          allocations: [
            {
              possessionContextId: 'CTX001',
              assetId: 'camera-001',
              allocatedFrom: '09:00',
              possessionFrom: '10:00',
              possessionTo: '14:00',
              allocatedTo: '15:00',
            },
          ],
        })
      )
    );
    expect(result.allocations).toEqual([
      {
        possessionContextId: 'CTX001',
        assetId: 'camera-001',
        allocatedFrom: '09:00',
        possessionFrom: '10:00',
        possessionTo: '14:00',
        allocatedTo: '15:00',
        status: 'allocated',
      },
    ]);
    expect(result.allocations[0]).not.toHaveProperty('requestId');
    expect(result.summary).toEqual({ allocationCount: 1 });
  });

  test('sorts allocations and ignores incomplete records', () => {
    const result = JSON.parse(
      assetAllocationRegistry(
        JSON.stringify({
          allocations: [
            {
              possessionContextId: 'CTX002',
              assetId: 'b',
              allocatedFrom: '1',
              allocatedTo: '2',
            },
            {
              possessionContextId: 'CTX001',
              assetId: 'a',
              allocatedFrom: '1',
              allocatedTo: '2',
              status: 'held',
            },
            { possessionContextId: 'CTX003', assetId: 'c' },
          ],
        })
      )
    );
    expect(result.allocations.map(item => item.possessionContextId)).toEqual([
      'CTX001',
      'CTX002',
    ]);
    expect(result.allocations[0].status).toBe('held');
  });

  test('returns an empty registry for invalid input', () => {
    expect(JSON.parse(assetAllocationRegistry('{'))).toEqual({
      allocations: [],
      summary: { allocationCount: 0 },
    });
  });
});
