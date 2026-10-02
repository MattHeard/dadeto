import { describe, expect, test } from '@jest/globals';
import { deliveryOutboundSegmentProposal } from '../../../src/core/browser/toys/2026-08-20/deliveryOutboundSegmentProposal.js';
import { pickupReturnSegmentProposal } from '../../../src/core/browser/toys/2026-08-20/pickupReturnSegmentProposal.js';

describe('directed travel boundary contract', () => {
  test.each([0, 1, 60, 61])(
    'rounds %i seconds identically in both directions',
    seconds => {
      const anchor = {
        pointId: 'possession',
        timestamp: '2026-01-01T12:00:00Z',
      };
      const coordinates = { latitude: '1.23456789', longitude: '-2.3456789' };
      const request = {
        possessionStartPoint: anchor,
        possessionEndPoint: anchor,
        origin: coordinates,
        destination: coordinates,
        startPointId: 'warehouse',
        endPointId: 'warehouse',
        segmentId: 'travel',
        travelDurationSeconds: seconds,
      };
      const outbound = JSON.parse(
        deliveryOutboundSegmentProposal(JSON.stringify(request))
      );
      const inbound = JSON.parse(
        pickupReturnSegmentProposal(JSON.stringify(request))
      );
      const duration = Math.ceil(seconds / 60) * 60000;
      expect(Date.parse(outbound.point.timestamp)).toBe(
        Date.parse(anchor.timestamp) - duration
      );
      expect(Date.parse(inbound.point.timestamp)).toBe(
        Date.parse(anchor.timestamp) + duration
      );
      expect(outbound.point.latitude).toBe('1.234568');
      expect(inbound.point.longitude).toBe('-2.345679');
      expect(outbound.segment).toEqual({
        segmentId: 'travel',
        startPointId: 'warehouse',
        endPointId: 'possession',
      });
      expect(inbound.segment).toEqual({
        segmentId: 'travel',
        startPointId: 'possession',
        endPointId: 'warehouse',
      });
    }
  );
});
