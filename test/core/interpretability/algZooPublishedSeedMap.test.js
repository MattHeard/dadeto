import { readFileSync } from 'node:fs';
import {
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  importInterpretabilityResearchBundleV2,
} from '../../../src/core/interpretability/interpretability.js';
import {
  createAlgZooPublishedSeedMapCore,
  createReplayObservations,
} from '../../../src/core/local/algZooPublishedSeedMapCore.js';
import { createAlgZooPublishedSeedMapV3 } from '../../../src/local/algZooPublishedSeedMap.js';
import { createTestZod } from './testZod.js';

const ARTICLE_URL =
  'https://www.alignment.org/blog/algzoo-uninterpreted-models-with-fewer-than-1-500-parameters/';
const HYPOTHESIS_NEURONS = [1, 2, 4, 6, 7];
const fixtureJson = readFileSync(
  new URL(
    '../../../docs/interpretability/algzoo-m16-10-arc-seed-map-v3.json',
    import.meta.url
  ),
  'utf8'
);
const sourceFixture = JSON.parse(
  readFileSync(
    new URL(
      '../../fixtures/interpretability/alg-zoo-m16-10.json',
      import.meta.url
    ),
    'utf8'
  )
);
const z = createTestZod();
const schemas = {
  evidenceGraphSchemasV1: createInterpretabilitySchemasV1(z),
  identityGraphSchemasV2: createInterpretabilitySchemasV2(z, value => value),
};

describe('portable ARC-published AlgZoo seed map', () => {
  it('exports and reimports cited approximate hypotheses without inventing the other neurons', () => {
    const generatedJson = createAlgZooPublishedSeedMapV3({ z });
    expect(generatedJson).toBe(fixtureJson.trimEnd());

    const imported = importInterpretabilityResearchBundleV2(
      fixtureJson,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;

    const { bundle } = imported;
    const { evidenceGraph, identityGraph, mechanismIdentityLinks } = bundle;
    expect(evidenceGraph.hypotheses).toHaveLength(5);
    expect(
      evidenceGraph.hypotheses.map(hypothesis => hypothesis.status)
    ).toEqual(Array(5).fill('proposed'));
    expect(
      evidenceGraph.hypotheses.every(
        hypothesis =>
          hypothesis.claim.includes(ARTICLE_URL) &&
          hypothesis.claim.includes('Assumptions:') &&
          hypothesis.claim.includes('does not quantify approximation error') &&
          hypothesis.evidenceIds.length === 0
      )
    ).toBe(true);

    const mechanismsById = new Map(
      evidenceGraph.mechanisms.map(mechanism => [mechanism.id, mechanism])
    );
    const interpretedNeuronIndices = new Set(
      evidenceGraph.hypotheses.flatMap(hypothesis =>
        hypothesis.mechanismIds.map(id => mechanismsById.get(id).neuronIndex)
      )
    );
    expect([...interpretedNeuronIndices].sort((a, b) => a - b)).toEqual(
      HYPOTHESIS_NEURONS
    );
    const unresolvedNeuronIndices = identityGraph.components
      .map(component => component.neuronIndex)
      .filter(neuronIndex => !interpretedNeuronIndices.has(neuronIndex))
      .sort((left, right) => left - right);
    expect(unresolvedNeuronIndices).toEqual([
      0, 3, 5, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);

    expect(identityGraph.components).toHaveLength(16);
    expect(identityGraph.activationPositions).toHaveLength(160);
    expect(identityGraph.observations).toHaveLength(160);
    expect(
      new Set(identityGraph.components.map(component => component.id)).size
    ).toBe(16);
    expect(
      new Set(
        identityGraph.observations.map(
          observation => observation.inputSequenceId
        )
      ).size
    ).toBe(1);
    expect(
      new Set(identityGraph.observations.map(observation => observation.runId))
        .size
    ).toBe(1);
    expect(mechanismIdentityLinks).toHaveLength(160);
    for (const neuronIndex of HYPOTHESIS_NEURONS) {
      const links = mechanismIdentityLinks.filter(
        link =>
          mechanismsById.get(link.legacyMechanismId)?.neuronIndex ===
          neuronIndex
      );
      expect(new Set(links.map(link => link.componentId)).size).toBe(1);
      expect(new Set(links.map(link => link.activationPositionId)).size).toBe(
        10
      );
    }
  });

  it('rejects a replay position whose component is absent', () => {
    expect(() =>
      createReplayObservations(
        { fixture: {}, input: [], inputSequenceId: 'sha256:test' },
        [],
        [
          {
            id: 'position-1',
            componentId: 'missing-component',
            timeStepIndex: 0,
          },
        ]
      )
    ).toThrow('Unknown AlgZoo component: missing-component');
  });

  it('throws when a generated seed map fails its portable schemas', () => {
    const createInvalidSeedMap = createAlgZooPublishedSeedMapCore({
      readFixture: () => ({
        ...sourceFixture,
        source: { ...sourceFixture.source, repository: 'invalid-repository' },
      }),
      hashSha256: () => 'a'.repeat(64),
    });

    expect(() => createInvalidSeedMap({ z })).toThrow(
      'Could not export AlgZoo seed map:'
    );
  });
});
