import { createInterpretabilitySchemasV1 } from '../../../src/core/interpretability/interpretability.js';
import { createTestZod, loadOptionalTestZod } from './testZod.js';

const fallbackSchemas =
  createInterpretabilitySchemasV1(
    createTestZod()
  ).interpretabilityJsonSchemasV1;

describe('optional Zod test double contract', () => {
  it('generates the strict and optional JSON Schema behavior used by production', () => {
    expect(fallbackSchemas.mechanism.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema'
    );
    expect(fallbackSchemas.mechanism.oneOf).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            id: { type: 'string', minLength: 1 },
            kind: { type: 'string', const: 'native-neuron' },
          }),
          required: expect.arrayContaining(['id', 'kind', 'model']),
          additionalProperties: false,
        }),
      ])
    );

    expect(fallbackSchemas.hypothesis).toMatchObject({
      type: 'object',
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      additionalProperties: false,
    });
    expect(fallbackSchemas.hypothesis.required).not.toContain('confidence');
    expect(fallbackSchemas.experiment.properties.runtime).toMatchObject({
      type: 'object',
      additionalProperties: {
        type: ['string', 'number', 'boolean'],
      },
    });
  });

  it('matches installed Zod v4 JSON Schema when the optional package is available', () => {
    const loaded = loadOptionalTestZod();
    if (loaded.source !== 'zod') return;

    const zodSchemas = createInterpretabilitySchemasV1(
      loaded.zod
    ).interpretabilityJsonSchemasV1;
    expect(fallbackSchemas).toEqual(zodSchemas);
  });

  it('supports strict objects, optional fields, refinements, and safeParse', () => {
    const zod = createTestZod();
    const schema = zod
      .strictObject({
        id: zod.string().min(1),
        confidence: zod.number().min(0).max(1).optional(),
      })
      .refine(value => value.id === 'ready');

    expect(schema.parse({ id: 'ready' })).toEqual({ id: 'ready' });
    expect(schema.safeParse({ id: 'ready', confidence: 0.5 }).success).toBe(
      true
    );
    expect(schema.safeParse({ id: 'ready', unknown: true }).success).toBe(
      false
    );
    expect(schema.safeParse({ id: 'not-ready' }).success).toBe(false);
    expect(zod.iso.datetime().safeParse('2026-10-17T10:00:00Z').success).toBe(
      true
    );
    expect(zod.iso.datetime().safeParse('2026-10-17').success).toBe(false);
  });

  it('proves the forced no-Zod path selects the fallback', () => {
    const previousValue = process.env.DADETO_TEST_WITHOUT_ZOD;
    process.env.DADETO_TEST_WITHOUT_ZOD = '1';
    try {
      expect(loadOptionalTestZod().source).toBe('fallback');
    } finally {
      if (previousValue === undefined) {
        delete process.env.DADETO_TEST_WITHOUT_ZOD;
      } else {
        process.env.DADETO_TEST_WITHOUT_ZOD = previousValue;
      }
    }
  });
});
