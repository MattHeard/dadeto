import {
  createIdentityReferenceSchemaV1,
  exportIdentityReferencesV1,
  importIdentityReferencesV1,
  summarizeIdentityReferencesV1,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const identityReferenceSchemaV1 =
  createIdentityReferenceSchemaV1(createTestZod());

/**
 * Create one attributable reference fixture.
 * @param {string} entityType Referenced entity category.
 * @param {string} entityId Original entity identifier.
 * @param {Record<string, string>} [additions] Optional fixture overrides.
 * @returns {Record<string, any>} Versioned reference claim.
 */
function referenceClaim(entityType, entityId, additions = {}) {
  return {
    schemaVersion: 1,
    claimId: `claim-${entityType}-${entityId}-${additions.authorId ?? 'a'}`,
    entityType,
    entityId,
    authorId: additions.authorId ?? 'researcher-a',
    source: additions.source ?? 'atlas-submission',
    sourceRecordId: additions.sourceRecordId ?? 'submission-1',
    recordedAt: additions.recordedAt ?? '2026-10-23T10:00:00Z',
    ...(additions.identityDescriptor
      ? { identityDescriptor: additions.identityDescriptor }
      : {}),
  };
}

describe('versioned additive identity references', () => {
  it('accepts attributable references to entity kinds that are not indexed yet', () => {
    const entityTypes = [
      'model',
      'checkpoint',
      'component',
      'activation-position',
      'observation',
      'experiment',
      'structural-connection',
      'circuit',
      'circuit-snapshot',
      'other',
    ];
    const claims = entityTypes.map((entityType, index) =>
      referenceClaim(entityType, `external-id-${index}`)
    );

    const result = summarizeIdentityReferencesV1(
      claims,
      identityReferenceSchemaV1
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.entities).toHaveLength(entityTypes.length);
    expect(result.entities.every(entity => entity.state === 'unresolved')).toBe(
      true
    );
    expect(result.claims).toEqual(
      [...claims].sort((left, right) =>
        left.claimId.localeCompare(right.claimId)
      )
    );
  });

  it('round trips the original reference IDs and their provenance', () => {
    const claims = [
      referenceClaim('experiment', 'experiment-unindexed', {
        source: 'neuronpedia-import',
        sourceRecordId: 'page-83',
      }),
    ];
    const exported = exportIdentityReferencesV1(
      claims,
      identityReferenceSchemaV1
    );

    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const imported = importIdentityReferencesV1(
      exported.json,
      identityReferenceSchemaV1
    );

    expect(imported).toMatchObject({
      valid: true,
      claims,
      entities: [
        {
          entityType: 'experiment',
          entityId: 'experiment-unindexed',
          state: 'unresolved',
        },
      ],
    });
  });

  it('resolves compatible definitions deterministically without mutating old claims', () => {
    const unresolved = referenceClaim('component', 'component-7');
    const previous = [unresolved];
    const before = structuredClone(previous);
    const resolved = [
      unresolved,
      referenceClaim('component', 'component-7', {
        authorId: 'researcher-b',
        sourceRecordId: 'indexed-component-7',
        identityDescriptor: '["model-x",0,"neuron-7"]',
      }),
    ];

    const result = summarizeIdentityReferencesV1(
      resolved,
      identityReferenceSchemaV1
    );

    expect(previous).toEqual(before);
    expect(result).toMatchObject({
      valid: true,
      entities: [
        {
          entityType: 'component',
          entityId: 'component-7',
          state: 'resolved',
          identityDescriptor: '["model-x",0,"neuron-7"]',
        },
      ],
    });
  });

  it('surfaces incompatible definitions as an explicit conflict and keeps both claims', () => {
    const claims = [
      referenceClaim('checkpoint', 'checkpoint-1', {
        identityDescriptor: 'model-x@revision-a',
      }),
      referenceClaim('checkpoint', 'checkpoint-1', {
        authorId: 'researcher-b',
        identityDescriptor: 'model-x@revision-b',
      }),
    ];

    const result = summarizeIdentityReferencesV1(
      claims,
      identityReferenceSchemaV1
    );

    expect(result).toMatchObject({
      valid: true,
      entities: [
        {
          entityType: 'checkpoint',
          entityId: 'checkpoint-1',
          state: 'conflict',
          conflictingIdentities: ['model-x@revision-a', 'model-x@revision-b'],
          claims: [...claims].sort((left, right) =>
            left.claimId.localeCompare(right.claimId)
          ),
        },
      ],
    });
  });

  it('rejects malformed claims and duplicate claim identities', () => {
    const valid = referenceClaim('component', 'component-7');

    expect(
      summarizeIdentityReferencesV1(
        [{ ...valid, entityId: '' }],
        identityReferenceSchemaV1
      ).valid
    ).toBe(false);
    const componentIdentity = [
      'model-x',
      'https://example.test/model-x',
      'architecture-x',
      'mlp',
      0,
      'mlp.output',
      7,
    ];
    const componentId = `atlas:v2:component:${encodeURIComponent(JSON.stringify(componentIdentity))}`;
    expect(
      summarizeIdentityReferencesV1(
        [
          referenceClaim('component', componentId, {
            identityDescriptor: JSON.stringify(componentIdentity),
          }),
        ],
        identityReferenceSchemaV1
      ).valid
    ).toBe(true);
    expect(
      summarizeIdentityReferencesV1(
        [
          referenceClaim('component', componentId, {
            identityDescriptor: JSON.stringify(['different-component']),
          }),
        ],
        identityReferenceSchemaV1
      ).valid
    ).toBe(false);
    expect(
      summarizeIdentityReferencesV1(
        [referenceClaim('component', 'atlas:v2:component:%7Bbad')],
        identityReferenceSchemaV1
      ).valid
    ).toBe(false);
    expect(
      summarizeIdentityReferencesV1([valid, valid], identityReferenceSchemaV1)
        .valid
    ).toBe(false);
    expect(
      importIdentityReferencesV1(
        JSON.stringify({ schemaVersion: 2, claims: [] }),
        identityReferenceSchemaV1
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'unsupported-version' }],
    });
  });

  it('returns stable failures for malformed envelopes and missing adapters', () => {
    expect(
      summarizeIdentityReferencesV1('invalid', identityReferenceSchemaV1)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-references' }],
    });
    expect(summarizeIdentityReferencesV1([], null)).toMatchObject({
      valid: false,
      errors: [{ code: 'missing-schema-validator' }],
    });
    expect(exportIdentityReferencesV1([], null)).toMatchObject({
      valid: false,
      errors: [{ code: 'missing-schema-validator' }],
    });
    expect(
      importIdentityReferencesV1(null, identityReferenceSchemaV1)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(
      importIdentityReferencesV1('{', identityReferenceSchemaV1)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(
      importIdentityReferencesV1('[]', identityReferenceSchemaV1)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-document' }],
    });
    expect(
      importIdentityReferencesV1(
        JSON.stringify({ schemaVersion: 1, claims: [], ignored: true }),
        identityReferenceSchemaV1
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'unsupported-version' }],
    });
  });
});
