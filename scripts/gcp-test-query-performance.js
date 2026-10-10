import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const runtimeDepsRequire = createRequire(
  new URL('../src/cloud/runtime-deps/package.json', import.meta.url)
);
const SAMPLE_COUNT = 30;
const CONCURRENCY = 3;
const COMMITMENT_COUNT = 100;
const DELIVERY_TIMESTAMP = '2030-01-02T19:00:00Z';

/**
 * Return a nearest-rank percentile from finite non-negative samples.
 * @param {number[]} values Samples in milliseconds.
 * @param {number} percentile Percentile in [0, 100].
 * @returns {number|null} Nearest-rank value, or null for no samples.
 */
export function percentile(values, percentile) {
  if (!values.length) return null;
  if (!Number.isFinite(percentile) || percentile < 0 || percentile > 100)
    throw new Error('invalid-percentile');
  const sorted = [...values].sort((first, second) => first - second);
  const rank = Math.max(1, Math.ceil((percentile / 100) * sorted.length));
  return sorted[rank - 1];
}

/**
 * Seed a fixed-size Firestore query fixture and collect deployed timings.
 * @param {{databaseId: string, environment: string, projectId: string, endpoint: string, credentialsJson: string, fetchImpl?: typeof fetch}} options Test environment and HTTP dependency.
 * @returns {Promise<object>} Machine-readable measurement document.
 */
export async function measureRunnerCommitmentQuery({
  databaseId,
  environment,
  projectId,
  endpoint,
  credentialsJson,
  fetchImpl = fetch,
}) {
  const credentials = JSON.parse(credentialsJson);
  const { cert, initializeApp } = runtimeDepsRequire('firebase-admin/app');
  const { getFirestore } = runtimeDepsRequire('firebase-admin/firestore');
  const app = initializeApp(
    { credential: cert(credentials), projectId },
    `query-performance-${environment}`
  );
  const db = getFirestore(app, databaseId);
  const requestBody = makeRequestBody();
  await seedCommitments(db, environment, requestBody.possessionContext.startPoint.timestamp);
  const samples = await collectQuerySamples({ endpoint, requestBody, fetchImpl });
  return createPerformanceReport({ environment, requestBody, samples });
}

/**
 * Build the versioned, machine-readable latency artifact.
 * @param {{environment: string, requestBody: Record<string, any>, samples: Array<{ok: boolean, durationMs: number}>}} options Collected benchmark evidence.
 * @returns {object} Performance report.
 */
export function createPerformanceReport({ environment, requestBody, samples }) {
  const durations = samples.filter(sample => sample.ok).map(sample => sample.durationMs);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment,
    query: 'object-minute-rental-search.listForRunner',
    status:
      samples.length === SAMPLE_COUNT && samples.every(sample => sample.ok)
        ? 'observed'
        : 'incomplete',
    fixture: {
      matchingCommitments: COMMITMENT_COUNT,
      relatedSegments: COMMITMENT_COUNT,
      relatedPoints: COMMITMENT_COUNT * 2,
    },
    concurrency: CONCURRENCY,
    requestedSamples: SAMPLE_COUNT,
    completedSamples: durations.length,
    latencyMs: { p50: percentile(durations, 50), p95: percentile(durations, 95) },
    request: {
      searchText: requestBody.searchText,
      deliveryTimestamp: requestBody.possessionContext.startPoint.timestamp,
      pickupTimestamp: requestBody.possessionContext.endPoint.timestamp,
    },
    samples,
  };
}

/** @returns {Record<string, unknown>} Stable API request shared by every sample. */
export function makeRequestBody() {
  const delivery = new Date(DELIVERY_TIMESTAMP);
  const pickup = new Date(delivery.getTime() + 60 * 60 * 1000);
  return {
    searchText: 'football',
    possessionContext: {
      startPoint: {
        pointId: 'PERFORMANCE-DELIVERY',
        timestamp: delivery.toISOString(),
        latitude: 52.510833,
        longitude: 13.296667,
      },
      endPoint: {
        pointId: 'PERFORMANCE-PICKUP',
        timestamp: pickup.toISOString(),
        latitude: 52.510833,
        longitude: 13.296667,
      },
    },
  };
}

/** @param {{batch: () => {set: (reference: unknown, value: object) => void, commit: () => Promise<unknown>}, collection: (name: string) => {doc: (id: string) => unknown}}} db Firestore database. @param {string} environment Unique test environment. @param {string} deliveryTimestamp Shared request timestamp. */
export async function seedCommitments(db, environment, deliveryTimestamp) {
  const batch = db.batch();
  const prefix = `query-perf-${environment}`;
  const deliveryDate = deliveryTimestamp.slice(0, 10);
  for (let index = 0; index < COMMITMENT_COUNT; index += 1) {
    const segmentId = `${prefix}-segment-${index}`;
    const startPointId = `${prefix}-start-${index}`;
    const endPointId = `${prefix}-end-${index}`;
    const minute = String(index % 60).padStart(2, '0');
    batch.set(db.collection('runner_assignments').doc(`${prefix}-${index}`), {
      personId: 'RUNNER-1',
      segmentId,
    });
    batch.set(db.collection('segments').doc(segmentId), {
      startPointId,
      endPointId,
    });
    batch.set(db.collection('spacetime_points').doc(startPointId), {
      timestamp: `${deliveryDate}T01:${minute}:00Z`,
    });
    batch.set(db.collection('spacetime_points').doc(endPointId), {
      timestamp: `${deliveryDate}T02:${minute}:00Z`,
    });
  }
  await batch.commit();
}

/** @param {{endpoint: string, requestBody: object, fetchImpl: typeof fetch}} options HTTP sample inputs. */
export async function collectQuerySamples({ endpoint, requestBody, fetchImpl }) {
  const samples = [];
  let nextSample = 0;
  const worker = async () => {
    while (nextSample < SAMPLE_COUNT) {
      const index = nextSample;
      nextSample += 1;
      const startedAt = performance.now();
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const body = await response.json();
        samples[index] = {
          sample: index + 1,
          durationMs: rounded(performance.now() - startedAt),
          statusCode: response.status,
          ok: response.ok && body?.valid === true,
          ...(response.ok && body?.valid === true ? {} : { error: 'query-response-not-valid' }),
        };
      } catch (error) {
        samples[index] = {
          sample: index + 1,
          durationMs: rounded(performance.now() - startedAt),
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return samples;
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const outputPath = process.env.QUERY_PERFORMANCE_OUTPUT ?? '/tmp/query-performance.json';
  let result;
  try {
    result = await measureRunnerCommitmentQuery({
      databaseId: requiredEnv('DATABASE_ID'),
      environment: requiredEnv('ENVIRONMENT'),
      projectId: requiredEnv('PROJECT_ID'),
      endpoint: requiredEnv('OBJECT_MINUTE_RENTAL_SEARCH_URL'),
      credentialsJson: requiredEnv('GOOGLE_CREDENTIALS_JSON'),
    });
  } catch (error) {
    result = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: result.status, outputPath }));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing-${name.toLowerCase()}`);
  return value;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await main();
}
