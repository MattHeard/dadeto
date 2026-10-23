import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import {
  appendIdentityReferenceV1,
  createInterpretabilityResearchServiceV1,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  exportInterpretabilityResearchBundleV3,
  exportInterpretabilityResearchBundleV5,
  importInterpretabilityResearchBundleV2,
  summarizeIdentityReferencesV1,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const schemas = {
  evidenceGraphSchemasV1: createInterpretabilitySchemasV1(createTestZod()),
  identityGraphSchemasV2: createInterpretabilitySchemasV2(createTestZod()),
};
const emptyEvidenceGraph = {
  mechanisms: [],
  hypotheses: [],
  experiments: [],
  estimates: [],
  evidence: [],
  edges: [],
};
const emptyIdentityGraph = {
  components: [],
  activationPositions: [],
  observations: [],
  structuralConnections: [],
  circuitSnapshots: [],
};
const unresolvedReference = {
  schemaVersion: 1,
  claimId: 'claim-experiment-external-1',
  entityType: 'experiment',
  entityId: 'external-experiment-1',
  authorId: 'investigator-a',
  source: 'atlas-submission',
  sourceRecordId: 'submission-a',
  recordedAt: '2026-10-23T10:00:00Z',
};

/**
 * Create a valid empty V3 bundle for service tests.
 * @returns {string} Portable bundle JSON.
 */
function createInitialBundle() {
  const exported = exportInterpretabilityResearchBundleV3(
    { evidenceGraph: emptyEvidenceGraph, identityGraph: emptyIdentityGraph },
    schemas
  );
  if (!exported.valid) throw new Error('Empty portable bundle is invalid.');
  return exported.json;
}

/**
 * Create an in-memory service with observable permission forwarding.
 * @param {string} initialJson Initial portable bundle.
 * @returns {Record<string, any>} Service and test observations.
 */
function createMemoryService(initialJson) {
  let storedJson = initialJson;
  const loadPermissions = [];
  const savePermissions = [];
  const service = createInterpretabilityResearchServiceV1({
    loadBundle: async allowEffects => {
      loadPermissions.push(allowEffects);
      return storedJson;
    },
    saveBundle: async (allowEffects, json) => {
      savePermissions.push(allowEffects);
      storedJson = json;
    },
    schemas,
  });
  return {
    service,
    loadPermissions,
    savePermissions,
    getStoredJson: () => storedJson,
  };
}

describe('additive identity-reference service', () => {
  it('stores an unresolved reference, resolves it later, and preserves earlier evidence', async () => {
    const allowEffects = createAllowEffects();
    const initialJson = createInitialBundle();
    const initial = importInterpretabilityResearchBundleV2(
      initialJson,
      schemas
    );
    expect(initial.valid).toBe(true);
    if (!initial.valid) return;
    const previousEvidence = structuredClone(initial.bundle.evidenceGraph);
    const memory = createMemoryService(initialJson);

    const first = await memory.service.submitIdentityReference(
      allowEffects,
      unresolvedReference
    );
    expect(first.valid).toBe(true);
    expect(memory.savePermissions).toEqual([allowEffects]);
    expect(JSON.parse(memory.getStoredJson())).toMatchObject({
      schemaVersion: 5,
      identityReferences: [unresolvedReference],
    });
    expect(
      await memory.service.readIdentityReferences(allowEffects)
    ).toMatchObject({ valid: true, entities: [{ state: 'unresolved' }] });

    const resolvedReference = {
      ...unresolvedReference,
      claimId: 'claim-experiment-external-1-resolution',
      authorId: 'investigator-b',
      sourceRecordId: 'indexed-experiment-1',
      identityDescriptor: 'experiment:external-experiment-1',
    };
    const second = await memory.service.submitIdentityReference(
      allowEffects,
      resolvedReference
    );
    expect(second.valid).toBe(true);
    const imported = importInterpretabilityResearchBundleV2(
      memory.getStoredJson(),
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(imported.bundle.identityReferences).toEqual([
      unresolvedReference,
      resolvedReference,
    ]);
    expect(imported.bundle.evidenceGraph).toEqual(previousEvidence);
    expect(
      summarizeIdentityReferencesV1(
        imported.bundle.identityReferences,
        schemas.identityGraphSchemasV2.identityReferenceSchemaV1
      ).entities
    ).toMatchObject([{ state: 'resolved' }]);
    expect(
      await memory.service.readIdentityReferences(allowEffects)
    ).toMatchObject({ valid: true, entities: [{ state: 'resolved' }] });
    expect(memory.loadPermissions).toEqual([
      allowEffects,
      allowEffects,
      allowEffects,
      allowEffects,
    ]);
    expect(memory.savePermissions).toEqual([allowEffects, allowEffects]);
  });

  it('accepts the direct reference-schema adapter shape', async () => {
    const allowEffects = createAllowEffects();
    const json = createInitialBundle();
    const directSchemas = {
      evidenceGraphSchemasV1: schemas.evidenceGraphSchemasV1,
      identityGraphSchemaV2:
        schemas.identityGraphSchemasV2.identityGraphSchemaV2,
      identityReferenceSchemaV1:
        schemas.identityGraphSchemasV2.identityReferenceSchemaV1,
    };
    const service = createInterpretabilityResearchServiceV1({
      loadBundle: async () => json,
      saveBundle: async () => {},
      schemas: directSchemas,
    });

    expect(await service.readIdentityReferences(allowEffects)).toMatchObject({
      valid: true,
      claims: [],
      entities: [],
    });
  });

  it('rejects invalid appends and portable V5 references', () => {
    const imported = importInterpretabilityResearchBundleV2(
      createInitialBundle(),
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    const invalidClaim = { ...unresolvedReference, entityId: '' };

    expect(
      appendIdentityReferenceV1(null, unresolvedReference, schemas)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(
      appendIdentityReferenceV1(
        { ...imported.bundle, identityReferences: [invalidClaim] },
        unresolvedReference,
        schemas
      ).valid
    ).toBe(false);
    expect(
      appendIdentityReferenceV1(imported.bundle, invalidClaim, schemas).valid
    ).toBe(false);
    expect(
      appendIdentityReferenceV1(
        { ...imported.bundle, identityReferences: undefined },
        unresolvedReference,
        {
          identityReferenceSchemaV1:
            schemas.identityGraphSchemasV2.identityReferenceSchemaV1,
        }
      ).valid
    ).toBe(true);

    const invalidExport = exportInterpretabilityResearchBundleV5(
      { ...imported.bundle, identityReferences: [invalidClaim] },
      schemas
    );
    expect(invalidExport).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-references' }],
    });
    const validExport = exportInterpretabilityResearchBundleV5(
      imported.bundle,
      schemas
    );
    expect(validExport.valid).toBe(true);
    if (!validExport.valid) return;
    const invalidEnvelope = JSON.parse(validExport.json);
    invalidEnvelope.identityReferences = [invalidClaim];
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(invalidEnvelope),
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-references' }],
    });
  });
});
