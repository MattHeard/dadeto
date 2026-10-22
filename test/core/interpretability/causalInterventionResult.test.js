import {
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  exportInterpretabilityResearchBundleV4,
  importInterpretabilityResearchBundleV2,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const schemas = {
  evidenceGraphSchemasV1: createInterpretabilitySchemasV1(createTestZod()),
  identityGraphSchemasV2: createInterpretabilitySchemasV2(createTestZod()),
};
const model = {
  modelId: 'synthetic-model',
  repository: 'https://huggingface.co/example/synthetic-model',
  revision: 'a'.repeat(40),
  architecture: 'SyntheticTransformer',
};
const causalInterventionResult = {
  schemaVersion: 1,
  status: 'tested',
  targetMechanismId: 'mechanism-causal',
  operation: 'set-activation-zero',
  timeStepIndex: 4,
  inputSequenceSha256: 'b'.repeat(64),
  predictedOutputIndex: 7,
  baselineOutputIndex: 2,
  intervenedOutputIndex: 7,
  causalScore: 1,
  artifactSha256: 'c'.repeat(64),
};

/**
 * Build a V4 bundle with only synthetic records and no research outcomes.
 * @param {boolean} includeCausalResult Include the typed optional experiment field.
 * @returns {Record<string, any>} Portable synthetic bundle.
 */
function createBundle(includeCausalResult) {
  return {
    evidenceGraph: {
      mechanisms: [
        {
          schemaVersion: 1,
          id: 'mechanism-causal',
          model,
          layerIndex: 0,
          activationHook: 'blocks.0.attention.output',
          kind: 'attention-head',
          headIndex: 3,
        },
      ],
      hypotheses: [],
      experiments: [
        {
          schemaVersion: 1,
          id: 'experiment-causal',
          status: 'completed',
          model,
          mechanismIds: ['mechanism-causal'],
          hypothesisIds: [],
          procedure: {
            repository: 'https://github.com/example/synthetic-replay',
            revision: 'd'.repeat(40),
            path: 'experiments/replay.js',
          },
          seed: 17,
          inputSplitId: 'synthetic-inputs-v1',
          runtime: { node: 'synthetic-test' },
          predictions: [{ target: 'output-index', expected: '7' }],
          observations: [],
          ...(includeCausalResult ? { causalInterventionResult } : {}),
          authorId: 'researcher-a',
          createdAt: '2026-10-20T12:00:00Z',
        },
      ],
      estimates: [],
      evidence: [],
      edges: [],
    },
    identityGraph: {
      components: [],
      activationPositions: [],
      observations: [],
      structuralConnections: [],
      circuitSnapshots: [],
    },
    accuracyEvaluations: [],
  };
}

describe('typed causal intervention result portability', () => {
  it('preserves tested results in a V4 bundle independently of other records', () => {
    const exported = exportInterpretabilityResearchBundleV4(
      createBundle(true),
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;

    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(imported.bundle.evidenceGraph.experiments[0]).toMatchObject({
      causalInterventionResult,
      predictions: [{ target: 'output-index', expected: '7' }],
    });
  });

  it('keeps V4 records without the optional result importable', () => {
    const exported = exportInterpretabilityResearchBundleV4(
      createBundle(false),
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;

    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(imported.bundle.evidenceGraph.experiments[0]).not.toHaveProperty(
      'causalInterventionResult'
    );
  });
});
