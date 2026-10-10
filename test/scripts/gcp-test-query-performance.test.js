import { describe, expect, test } from '@jest/globals';
import {
  collectQuerySamples,
  createPerformanceReport,
  makeRequestBody,
  percentile,
  seedCommitments,
} from '../../scripts/gcp-test-query-performance.js';

describe('GCP query performance measurements', () => {
  test('calculates nearest-rank p50 and p95 without timing thresholds', () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([40, 10, 30, 20], 50)).toBe(20);
    expect(
      percentile(
        Array.from({ length: 20 }, (_, index) => index + 1),
        95
      )
    ).toBe(19);
    expect(() => percentile([1], 101)).toThrow('invalid-percentile');
  });

  test('sends 30 identical requests at no more than three concurrent calls', async () => {
    let active = 0;
    let maxActive = 0;
    const requests = [];
    const requestBody = { searchText: 'football' };
    const fetchImpl = async (endpoint, options) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      requests.push({ endpoint, body: options.body });
      await Promise.resolve();
      active -= 1;
      return { ok: true, status: 200, json: async () => ({ valid: true }) };
    };

    const samples = await collectQuerySamples({
      endpoint: 'https://search.example.test',
      requestBody,
      fetchImpl,
    });

    expect(samples).toHaveLength(30);
    expect(samples.every(sample => sample.ok)).toBe(true);
    expect(requests).toHaveLength(30);
    expect(maxActive).toBe(3);
    expect(new Set(requests.map(request => request.endpoint))).toEqual(
      new Set(['https://search.example.test'])
    );
    expect(new Set(requests.map(request => request.body))).toEqual(
      new Set([JSON.stringify(requestBody)])
    );
  });

  test('captures failed HTTP responses as observations', async () => {
    const samples = await collectQuerySamples({
      endpoint: 'https://search.example.test',
      requestBody: {},
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        json: async () => ({ valid: false }),
      }),
    });

    expect(samples.every(sample => !sample.ok)).toBe(true);
    expect(samples.every(sample => sample.statusCode === 503)).toBe(true);
    expect(
      samples.every(sample => sample.error === 'query-response-not-valid')
    ).toBe(true);
  });

  test('writes p50 and p95 with fixture and fixed request metadata', () => {
    const samples = Array.from({ length: 30 }, (_, index) => ({
      sample: index + 1,
      durationMs: index + 1,
      ok: true,
    }));
    const report = createPerformanceReport({
      environment: 't-test',
      requestBody: {
        searchText: 'football',
        possessionContext: {
          startPoint: { timestamp: '2030-01-02T19:00:00Z' },
          endPoint: { timestamp: '2030-01-02T20:00:00Z' },
        },
      },
      samples,
    });

    expect(report).toMatchObject({
      schemaVersion: 1,
      status: 'observed',
      fixture: {
        matchingCommitments: 100,
        relatedSegments: 100,
        relatedPoints: 200,
      },
      concurrency: 3,
      requestedSamples: 30,
      completedSamples: 30,
      latencyMs: { p50: 15, p95: 29 },
      request: {
        searchText: 'football',
        deliveryTimestamp: '2030-01-02T19:00:00Z',
        pickupTimestamp: '2030-01-02T20:00:00Z',
      },
    });
  });

  test('uses the same fixed future possession window for each nightly run', () => {
    const requestBody = makeRequestBody();
    expect(requestBody.possessionContext).toMatchObject({
      startPoint: {
        timestamp: '2030-01-02T19:00:00.000Z',
        latitude: 52.510833,
        longitude: 13.296667,
      },
      endPoint: {
        timestamp: '2030-01-02T20:00:00.000Z',
        latitude: 52.510833,
        longitude: 13.296667,
      },
    });
  });

  test('seeds 100 isolated commitments in one Firestore batch', async () => {
    const writes = [];
    const db = {
      batch: () => ({
        set: (reference, value) => writes.push({ reference, value }),
        commit: async () => undefined,
      }),
      collection: name => ({
        doc: id => ({ collection: name, id }),
      }),
    };

    await seedCommitments(db, 't-test', '2030-01-02T19:00:00Z');

    expect(writes).toHaveLength(400);
    expect(
      writes.filter(
        write => write.reference.collection === 'runner_assignments'
      )
    ).toHaveLength(100);
    expect(
      writes.filter(write => write.reference.collection === 'segments')
    ).toHaveLength(100);
    expect(
      writes.filter(write => write.reference.collection === 'spacetime_points')
    ).toHaveLength(200);
    expect(writes[0].value).toMatchObject({
      personId: 'RUNNER-1',
      segmentId: 'query-perf-t-test-segment-0',
    });
  });
});
