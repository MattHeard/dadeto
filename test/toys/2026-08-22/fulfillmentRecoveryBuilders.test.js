import { expect, test } from '@jest/globals';
import {
  fulfillmentRecoverySegments,
  fulfillmentWarehouseSpacePoint,
} from '../../../src/core/browser/toys/2026-08-22/fulfillmentResult.js';

test('recovery builders preserve arrival IDs, tail order and authored identifiers', () => {
  const ids = {
    points: { inspectionComplete: 'inspected', cleaningComplete: 'clean' },
    segments: { inspection: 'inspect', cleaning: 'wash' },
  };
  expect(fulfillmentRecoverySegments(ids, 'arrival')).toEqual([
    { segmentId: 'inspect', startPointId: 'arrival', endPointId: 'inspected' },
    { segmentId: 'wash', startPointId: 'inspected', endPointId: 'clean' },
  ]);
  expect(ids.points).toEqual({
    inspectionComplete: 'inspected',
    cleaningComplete: 'clean',
  });
});

test('warehouse builders preserve IDs while normalizing the same coordinate contract', () => {
  const warehouse = {
    spacePointId: 'authored',
    latitude: 1.23456789,
    longitude: -2.3456789,
  };
  const normal = fulfillmentWarehouseSpacePoint(warehouse);
  const procurement = fulfillmentWarehouseSpacePoint(warehouse, 'generated');
  expect(normal).toEqual({
    spacePointId: 'authored',
    latitude: '1.234568',
    longitude: '-2.345679',
  });
  expect(procurement).toEqual({ ...normal, spacePointId: 'generated' });
  expect(warehouse.latitude).toBe(1.23456789);
});
