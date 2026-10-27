import { jest } from '@jest/globals';

import {
  parseFunctionEndpointLineage,
  functionEndpointLineageTestOnly,
} from '../../src/core/build/function-endpoint-lineage.js';

const registryUrl =
  'https://storage.googleapis.com/example-function-endpoints/function-endpoints.json';
const registryBody = JSON.stringify({
  schemaVersion: 1,
  environment: 'prod',
  functions: {
    objectMinuteRentalSearch: 'https://rental-search.example.run.app',
    getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
  },
});
const registrySha256 = 'a'.repeat(64);
const hashRegistryBody = () => registrySha256;

/**
 * Build a valid deployment lineage with optional test overrides.
 * @param {Record<string, any>} overrides Evidence sections to replace.
 * @returns {Record<string, any>} Complete lineage record.
 */
function validLineage(overrides = {}) {
  const base = {
    schemaVersion: 1,
    gcpProd: {
      runId: '39140379340',
      conclusion: 'success',
      terraformApply: 'success',
      sourceCommitSha: '4687262cbced0ae50fb47420d70318dde1e82143',
      completedAt: '2026-10-18T15:26:01Z',
      functionUrls: {
        objectMinuteRentalSearch: 'https://rental-search.example.run.app',
        getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
      },
    },
    registryObject: {
      url: registryUrl,
      gcpProdRunId: '39140379340',
      sourceCommitSha: '4687262cbced0ae50fb47420d70318dde1e82143',
      generation: '1792337153100867',
      etag: '"registry-etag"',
      body: registryBody,
    },
    netlify: {
      buildRunId: '39145150554',
      deploymentId: 'netlify-deploy-123',
      deploymentUrl: 'https://rental-search.netlify.app',
      conclusion: 'success',
      sourceCommitSha: 'b94733223b736f72925ba9c1418ce2c71e59077a',
      startedAt: '2026-10-18T16:28:27Z',
      registryUrl,
      registryGeneration: '1792337153100867',
      registryEtag: '"registry-etag"',
      registrySha256,
    },
  };
  return {
    ...base,
    ...overrides,
    gcpProd:
      overrides.gcpProd === null
        ? null
        : { ...base.gcpProd, ...overrides.gcpProd },
    registryObject:
      overrides.registryObject === null
        ? null
        : { ...base.registryObject, ...overrides.registryObject },
    netlify:
      overrides.netlify === null
        ? null
        : { ...base.netlify, ...overrides.netlify },
  };
}

/**
 * Parse a valid lineage record with test overrides.
 * @param {Record<string, any>} overrides Evidence sections to replace.
 * @returns {Record<string, unknown>} Validated lineage record.
 */
function parse(overrides = {}) {
  return parseFunctionEndpointLineage(
    JSON.stringify(validLineage(overrides)),
    { expectedRegistryUrl: registryUrl },
    hashRegistryBody
  );
}

/**
 * Parse valid evidence against a supplied stable registry URL.
 * @param {string} expectedRegistryUrl Stable URL under test.
 * @returns {Record<string, unknown>} Validated lineage record.
 */
function parseWithRegistryUrl(expectedRegistryUrl) {
  return parseFunctionEndpointLineage(
    JSON.stringify(validLineage()),
    { expectedRegistryUrl },
    hashRegistryBody
  );
}

describe('parseFunctionEndpointLineage', () => {
  it('validates and normalizes the successful deployment chain', () => {
    expect(parse()).toMatchObject({
      schemaVersion: 1,
      gcpProd: {
        runId: '39140379340',
        sourceCommitSha: '4687262cbced0ae50fb47420d70318dde1e82143',
      },
      registry: {
        url: registryUrl,
        generation: '1792337153100867',
        sha256: registrySha256,
        schemaVersion: 1,
        environment: 'prod',
      },
      netlify: {
        buildRunId: '39145150554',
        deploymentId: 'netlify-deploy-123',
        registrySha256,
      },
    });
  });

  it.each(['{', 'null', '[]'])('rejects malformed lineage JSON: %s', json => {
    expect(() =>
      parseFunctionEndpointLineage(
        json,
        { expectedRegistryUrl: registryUrl },
        hashRegistryBody
      )
    ).toThrow();
  });

  it('requires a stable public registry URL', () => {
    expect(() =>
      parseFunctionEndpointLineage(
        JSON.stringify(validLineage()),
        undefined,
        hashRegistryBody
      )
    ).toThrow('Expected registry URL is required');
    expect(() =>
      parseWithRegistryUrl('https://example.com/registry.json')
    ).toThrow('stable public GCS URL');
    expect(() =>
      parseWithRegistryUrl(
        'https://storage.googleapis.com/registry.json?version=1'
      )
    ).toThrow('stable public GCS URL');
    expect(() =>
      parseWithRegistryUrl(
        'https://storage.googleapis.com/registry.json#fragment'
      )
    ).toThrow('stable public GCS URL');
    expect(() =>
      parseFunctionEndpointLineage(
        JSON.stringify(validLineage()),
        {
          expectedRegistryUrl:
            'https://storage.googleapis.com/registry.json?version=1',
        },
        hashRegistryBody
      )
    ).toThrow('stable public GCS URL');
    expect(() =>
      parse({
        registryObject: { url: 'https://storage.googleapis.com/other.json' },
      })
    ).toThrow('does not match the stable registry URL');
  });

  it('rejects unsupported lineage schema versions', () => {
    expect(() => parse({ schemaVersion: 2 })).toThrow(
      'Lineage schemaVersion must be 1'
    );
  });

  it('requires a successful GCP apply and valid source identity', () => {
    expect(() => parse({ gcpProd: null })).toThrow(
      'GCP production evidence must be an object'
    );
    expect(() => parse({ gcpProd: { conclusion: 'failure' } })).toThrow(
      'workflow and Terraform apply must succeed'
    );
    expect(() => parse({ gcpProd: { terraformApply: 'failure' } })).toThrow(
      'workflow and Terraform apply must succeed'
    );
    expect(() => parse({ gcpProd: { runId: '0' } })).toThrow(
      'GCP production run ID must be a positive decimal string'
    );
    expect(() => parse({ gcpProd: { sourceCommitSha: 'bad' } })).toThrow(
      'GCP source commit SHA must be a 40-character hex SHA'
    );
    expect(() => parse({ gcpProd: { completedAt: 'yesterday' } })).toThrow(
      'GCP completion time must be a valid timestamp'
    );
    expect(() => parse({ gcpProd: { completedAt: '2026-10-18' } })).toThrow(
      'GCP completion time must be a valid timestamp'
    );
    expect(() => parse({ gcpProd: { completedAt: null } })).toThrow(
      'GCP completion time must be a valid timestamp'
    );
    expect(() =>
      parse({ gcpProd: { completedAt: '2026-99-99T12:00:00Z' } })
    ).toThrow('GCP completion time must be a valid timestamp');
  });

  it('rejects registry evidence that is detached from the GCP source', () => {
    expect(() => parse({ registryObject: null })).toThrow(
      'Registry object evidence must be an object'
    );
    expect(() =>
      parse({ registryObject: { gcpProdRunId: '39140379341' } })
    ).toThrow('not linked to the successful GCP run');
    expect(() =>
      parse({
        registryObject: {
          sourceCommitSha: '0000000000000000000000000000000000000000',
        },
      })
    ).toThrow('does not match the GCP source commit');
    expect(() =>
      parse({
        gcpProd: {
          functionUrls: {
            objectMinuteRentalSearch: 'https://other.example.run.app',
            getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
          },
        },
      })
    ).toThrow('do not match the GCP deployment');
    expect(() =>
      parse({
        gcpProd: {
          functionUrls: {
            objectMinuteRentalSearch: 'https://rental-search.example.run.app',
            getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
            extra: 'https://extra.example.run.app',
          },
        },
      })
    ).toThrow('do not match the GCP deployment');
  });

  it.each([
    [{ schemaVersion: 2 }, 'schemaVersion must be 1'],
    [{ environment: 'test' }, 'environment must be prod'],
    [{ functions: {} }, 'missing the objectMinuteRentalSearch function key'],
  ])(
    'reuses the registry schema contract for invalid objects',
    (patch, message) => {
      const invalidBody = JSON.stringify({
        schemaVersion: 1,
        environment: 'prod',
        functions: {
          objectMinuteRentalSearch: 'https://rental-search.example.run.app',
          getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
        },
        ...patch,
      });
      expect(() => parse({ registryObject: { body: invalidBody } })).toThrow(
        message
      );
    }
  );

  it('validates optional GCS generation and ETag metadata', () => {
    expect(() => parse({ registryObject: { generation: 12 } })).toThrow(
      'Registry generation must be a decimal string'
    );
    expect(() => parse({ registryObject: { etag: '' } })).toThrow(
      'Registry ETag must be a non-empty string'
    );
    expect(() =>
      parse({
        registryObject: { generation: undefined, etag: undefined },
        netlify: { registryGeneration: undefined, registryEtag: undefined },
      })
    ).not.toThrow();
  });

  it('requires a successful later Netlify build tied to the same object', () => {
    expect(() => parse({ netlify: null })).toThrow(
      'Netlify deployment evidence must be an object'
    );
    expect(() => parse({ netlify: { conclusion: 'failure' } })).toThrow(
      'Netlify build and deployment must succeed'
    );
    expect(() => parse({ netlify: { sourceCommitSha: 'bad' } })).toThrow(
      'Netlify source commit SHA must be a 40-character hex SHA'
    );
    expect(() =>
      parse({ netlify: { deploymentUrl: 'http://example.test' } })
    ).toThrow('Netlify deployment URL must be a valid HTTPS URL');
    expect(() => parse({ netlify: { deploymentUrl: 'not-a-url' } })).toThrow(
      'Netlify deployment URL must be a valid HTTPS URL'
    );
    expect(() =>
      parse({
        netlify: { deploymentUrl: 'https://user:password@example.test' },
      })
    ).toThrow('Netlify deployment URL must be a valid HTTPS URL');
    expect(() =>
      parse({ netlify: { registryUrl: 'https://other.example/registry.json' } })
    ).toThrow('did not use the published registry URL');
    expect(() =>
      parse({ netlify: { registrySha256: '0'.repeat(64) } })
    ).toThrow('consumed a different registry object');
    expect(() => parse({ netlify: { registrySha256: 'bad' } })).toThrow(
      'Registry SHA-256 must be a 64-character hex digest'
    );
    expect(() => parse({ netlify: { registrySha256: undefined } })).toThrow(
      'Registry SHA-256 must be a 64-character hex digest'
    );
    expect(() =>
      parse({ netlify: { startedAt: '2026-10-18T15:25:00Z' } })
    ).toThrow('must start after the GCP apply completes');
    expect(() =>
      parse({ netlify: { startedAt: '2026-10-18T15:26:01Z' } })
    ).toThrow('must start after the GCP apply completes');
  });

  it('rejects explicitly pinned stale registry generations and ETags', () => {
    expect(() => parse({ netlify: { registryGeneration: '1' } })).toThrow(
      'pinned an obsolete registry generation'
    );
    expect(() => parse({ netlify: { registryEtag: '"stale-etag"' } })).toThrow(
      'consumed a different registry ETag'
    );
    expect(() => parse({ netlify: { registryGeneration: 'bad' } })).toThrow(
      'Registry generation must be a decimal string'
    );
  });

  it('requires deployment identifiers and valid URLs for each run', () => {
    expect(() => parse({ netlify: { buildRunId: '0' } })).toThrow(
      'Netlify build run ID must be a positive decimal string'
    );
    expect(() => parse({ netlify: { deploymentId: '' } })).toThrow(
      'Netlify deployment ID must be a non-empty string'
    );
    expect(() => parse({ netlify: { registryEtag: '' } })).toThrow(
      'Registry ETag must be a non-empty string'
    );
    expect(() =>
      parse({ gcpProd: { functionUrls: { broken: 'http://localhost' } } })
    ).toThrow('GCP function URL for broken must be a valid HTTPS URL');
    expect(() => parse({ gcpProd: { functionUrls: [] } })).toThrow(
      'GCP function URL evidence must be an object'
    );
  });
});

test('delegates the exact registry body to the injected UTF-8 hasher', () => {
  const digest = 'b'.repeat(64);
  const sha256Utf8 = jest.fn(() => digest);
  const result = parseFunctionEndpointLineage(
    JSON.stringify(validLineage({ netlify: { registrySha256: digest } })),
    { expectedRegistryUrl: registryUrl },
    sha256Utf8
  );
  expect(sha256Utf8).toHaveBeenCalledTimes(1);
  expect(sha256Utf8).toHaveBeenCalledWith(registryBody);
  expect(result.registry.sha256).toBe(digest);
});

test('propagates hasher failures without returning fallback evidence', () => {
  const failure = new Error('hasher failed');
  expect(() =>
    parseFunctionEndpointLineage(
      JSON.stringify(validLineage()),
      { expectedRegistryUrl: registryUrl },
      () => {
        throw failure;
      }
    )
  ).toThrow(failure);
});

describe('lineage parser discriminating inputs', () => {
  test.each([
    [
      { registryObject: { url: '' } },
      'Registry object URL must be a non-empty string.',
    ],
    [
      { registryObject: { gcpProdRunId: '0' } },
      'Registry GCP run ID must be a positive decimal string.',
    ],
    [
      { registryObject: { sourceCommitSha: 'bad' } },
      'Registry source commit SHA must be a 40-character hex SHA.',
    ],
    [
      { registryObject: { body: '' } },
      'Registry object body must be a non-empty string.',
    ],
    [
      { netlify: { deploymentUrl: '' } },
      'Netlify deployment URL must be a non-empty string.',
    ],
    [
      { netlify: { startedAt: 'yesterday' } },
      'Netlify start time must be a valid timestamp.',
    ],
    [
      { netlify: { registryUrl: '' } },
      'Netlify registry URL must be a non-empty string.',
    ],
    [
      { netlify: { deploymentId: ' \n\t ' } },
      'Netlify deployment ID must be a non-empty string.',
    ],
    [
      { gcpProd: { runId: 123 } },
      'GCP production run ID must be a positive decimal string.',
    ],
    [
      { gcpProd: { completedAt: { toString: 'invalid' } } },
      'GCP completion time must be a valid timestamp.',
    ],
    [
      { gcpProd: { functionUrls: { broken: '' } } },
      'GCP function URL for broken must be a non-empty string.',
    ],
  ])('retains the diagnostic for %j', (patch, message) => {
    expect(() => parse(patch)).toThrow(message);
  });

  test.each(['null', '[]', '1', '"text"'])(
    'rejects non-record roots: %s',
    input => {
      expect(() =>
        parseFunctionEndpointLineage(input, {}, hashRegistryBody)
      ).toThrow('Lineage JSON must be an object.');
    }
  );

  test.each([
    ['gcpProd', 'GCP production evidence'],
    ['registryObject', 'Registry object evidence'],
    ['netlify', 'Netlify deployment evidence'],
  ])('rejects array-valued %s evidence', (field, label) => {
    const record = validLineage();
    record[field] = [];
    expect(() =>
      parseFunctionEndpointLineage(
        JSON.stringify(record),
        { expectedRegistryUrl: registryUrl },
        hashRegistryBody
      )
    ).toThrow(`${label} must be an object.`);
  });

  test('distinguishes JSON syntax failures from non-record values', () => {
    expect(() =>
      parseFunctionEndpointLineage('{', {}, hashRegistryBody)
    ).toThrow('Lineage record must be valid JSON.');
  });

  test.each(['not-a-url', 'http://storage.googleapis.com/registry.json'])(
    'retains the expected URL diagnostic for %s',
    value => {
      expect(() => parseWithRegistryUrl(value)).toThrow(
        'Expected registry URL must be a valid HTTPS URL.'
      );
    }
  );

  test.each(['https://user@example.test', 'https://:password@example.test'])(
    'rejects a URL with only one credential component: %s',
    deploymentUrl => {
      expect(() => parse({ netlify: { deploymentUrl } })).toThrow(
        'Netlify deployment URL must be a valid HTTPS URL.'
      );
    }
  );

  test.each(['x1', '1x'])(
    'rejects non-digit generation edges: %s',
    generation => {
      expect(() => parse({ registryObject: { generation } })).toThrow(
        'Registry generation must be a decimal string.'
      );
    }
  );

  test.each(['x123', '123x'])('rejects non-digit run ID edges: %s', runId => {
    expect(() => parse({ gcpProd: { runId } })).toThrow(
      'GCP production run ID must be a positive decimal string.'
    );
  });

  test.each([`x${'a'.repeat(40)}`, `${'a'.repeat(40)}x`])(
    'anchors commit identity: %s',
    sourceCommitSha => {
      expect(() => parse({ gcpProd: { sourceCommitSha } })).toThrow(
        'GCP source commit SHA must be a 40-character hex SHA.'
      );
    }
  );

  test.each([`x${'a'.repeat(64)}`, `${'a'.repeat(64)}x`])(
    'anchors registry digests: %s',
    registrySha256 => {
      expect(() => parse({ netlify: { registrySha256 } })).toThrow(
        'Registry SHA-256 must be a 64-character hex digest.'
      );
    }
  );

  test('permits independently absent consumer pins while published pins are present', () => {
    expect(
      parse({
        netlify: { registryGeneration: undefined, registryEtag: undefined },
      }).netlify
    ).toMatchObject({ registryGeneration: undefined, registryEtag: undefined });
  });

  test.each(['2026-10-18T17:26:01.125+02:00', '2026-10-18T14:26:01.125-01:00'])(
    'accepts fractional seconds and signed offsets: %s',
    completedAt => {
      expect(parse({ gcpProd: { completedAt } }).gcpProd.completedAt).toBe(
        completedAt
      );
    }
  );

  test('preserves the original trailing-text calendar rejection', () => {
    expect(() =>
      parse({ gcpProd: { completedAt: '2026-10-18T15:26:01Z\n' } })
    ).toThrow('GCP completion time must be a valid timestamp.');
  });

  test('normalizes uppercase identities and digest text', () => {
    const sourceCommitSha = 'ABCDEF0123456789ABCDEF0123456789ABCDEF01';
    const result = parse({
      gcpProd: { sourceCommitSha },
      registryObject: { sourceCommitSha },
      netlify: {
        sourceCommitSha,
        registrySha256: registrySha256.toUpperCase(),
      },
    });
    expect(result.gcpProd.sourceCommitSha).toBe(sourceCommitSha.toLowerCase());
    expect(result.netlify.sourceCommitSha).toBe(sourceCommitSha.toLowerCase());
    expect(result.netlify.registrySha256).toBe(registrySha256);
  });

  test('map comparison preserves order independence and cardinality', () => {
    const fields = JSON.parse(registryBody).functions;
    expect(
      parse({
        gcpProd: {
          functionUrls: Object.fromEntries(Object.entries(fields).reverse()),
        },
      }).gcpProd.functionUrls
    ).toEqual(fields);
    expect(() =>
      parse({
        gcpProd: {
          functionUrls: { ...fields, zzExtra: 'https://extra.example.run.app' },
        },
      })
    ).toThrow('Registry function URLs do not match the GCP deployment.');
    expect(() =>
      parse({
        gcpProd: {
          functionUrls: {
            objectMinuteRentalSearch: fields.objectMinuteRentalSearch,
            zzOther: fields.getAuthorUuidV2,
          },
        },
      })
    ).toThrow('Registry function URLs do not match the GCP deployment.');
  });
});

describe('pure timestamp text stage', () => {
  const { parseTimestampText } = functionEndpointLineageTestOnly;
  test.each([
    '2026-10-18T15:26:01Z',
    '2026-10-18T15:26:01.123Z',
    '2026-10-18T15:26:01+02:30',
    '2026-10-18T15:26:01-02:30',
  ])('returns accepted text unchanged: %s', input => {
    expect(parseTimestampText(input).input).toBe(input);
  });
  test('rejects trailing newline text at the format stage', () => {
    expect(parseTimestampText('2026-10-18T15:26:01Z\n')).toBeNull();
  });
  test.each([
    undefined,
    null,
    0,
    [],
    {},
    Symbol('timestamp'),
    { toString: () => '2026-10-18T15:26:01Z' },
    'x2026-10-18T15:26:01Z',
    '2026-10-18T15:26:01Zx',
    '2026-10-18T15:26:01.12aZ',
    '2026-10-18T15:26:01z',
  ])('returns the invalid-format outcome: %s', input => {
    expect(parseTimestampText(input)).toBeNull();
  });
});
