/* @jest-environment jsdom */
import { createHash } from 'node:crypto';
import { describe, expect, it, jest } from '@jest/globals';
import {
  createCircuitStructuralSnapshotV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createNativeNeuronComponentV2,
  exportInterpretabilityResearchBundleV2,
  exportInterpretabilityResearchBundleV3,
  exportInterpretabilityResearchBundleV4,
  importInterpretabilityResearchBundleV2,
  migrateNativeNeuronMechanismV1ToV2,
} from '../../../../src/core/interpretability/interpretability.js';
import { createAtlasBundleViewer } from '../../../../src/core/browser/atlas/bundleViewer.js';
import { createAtlasPageController } from '../../../../src/core/browser/atlas/page.js';
import { createAtlasSchemaResolver } from '../../../../src/core/browser/atlas/schemaAdapter.js';
import { createTestZod } from '../../interpretability/testZod.js';

const model = {
  modelId: 'atlas-viewer-test-model',
  repository: 'https://huggingface.co/example/atlas-viewer-test-model',
  revision: 'a'.repeat(40),
  architecture: 'GPT2LMHeadModel',
};
const createdAt = '2026-10-20T10:00:00Z';
const mechanism = {
  schemaVersion: 1,
  id: 'mechanism-a',
  model,
  layerIndex: 2,
  activationHook: 'blocks.2.mlp.post_activation',
  kind: 'native-neuron',
  sourceId: 'mlp',
  neuronIndex: 7,
};

/** @returns {Record<string, any>} Injected schema adapters that do not load Zod. */
function createSchemas() {
  const z = createTestZod();
  return {
    evidenceGraphSchemasV1: createInterpretabilitySchemasV1(z),
    identityGraphSchemasV2: createInterpretabilitySchemasV2(z),
  };
}

/** @returns {Record<string, any>} Complete graph with competing claims and evidence. */
function createEvidenceGraph() {
  const hypotheses = [
    {
      schemaVersion: 1,
      id: 'hypothesis-a',
      revision: 1,
      claim: 'The neuron increases the selected token score.',
      status: 'proposed',
      mechanismIds: [mechanism.id],
      evidenceIds: ['evidence-negative'],
      confidence: 0.4,
      authorId: 'researcher-a',
      createdAt,
    },
    {
      schemaVersion: 1,
      id: 'hypothesis-b',
      revision: 1,
      claim: 'The neuron decreases the selected token score.',
      status: 'proposed',
      mechanismIds: [mechanism.id],
      evidenceIds: ['evidence-observed'],
      confidence: 0.6,
      authorId: 'researcher-b',
      createdAt,
    },
  ];
  const experiments = ['a', 'b'].map((suffix, index) => ({
    schemaVersion: 1,
    id: `experiment-${suffix}`,
    status: 'completed',
    model,
    mechanismIds: [mechanism.id],
    hypothesisIds: [`hypothesis-${suffix}`],
    procedure: {
      repository: 'https://github.com/example/atlas-viewer-experiment',
      revision: 'b'.repeat(40),
      path: 'experiments/intervention.py',
    },
    seed: 17 + index,
    inputSplitId: 'held-out-v1',
    runtime: { python: '3.12' },
    predictions: [{ target: 'token-score', expected: 'increase' }],
    observations: [
      { kind: 'negative', summary: 'The prediction did not reproduce.' },
    ],
    authorId: `researcher-${suffix}`,
    createdAt,
  }));
  const evidence = [
    {
      schemaVersion: 1,
      id: 'evidence-negative',
      kind: 'negative',
      summary: 'The held-out intervention contradicted hypothesis A.',
      mechanismIds: [mechanism.id],
      hypothesisIds: ['hypothesis-a'],
      experimentIds: ['experiment-a'],
      validationState: 'unreviewed',
      authorId: 'researcher-a',
      createdAt,
    },
    {
      schemaVersion: 1,
      id: 'evidence-observed',
      kind: 'observation',
      summary: 'The held-out intervention changed the token score.',
      mechanismIds: [mechanism.id],
      hypothesisIds: ['hypothesis-b'],
      experimentIds: ['experiment-b'],
      validationState: 'reviewed',
      authorId: 'researcher-b',
      createdAt,
    },
  ];
  const edges = [
    [
      'edge-a-mechanism-hypothesis',
      mechanism.id,
      'hypothesis-a',
      'connected-to',
    ],
    [
      'edge-b-mechanism-hypothesis',
      mechanism.id,
      'hypothesis-b',
      'connected-to',
    ],
    ['edge-c-contradicts', 'hypothesis-a', 'evidence-negative', 'contradicts'],
    ['edge-d-supports', 'hypothesis-b', 'evidence-observed', 'supports'],
    ['edge-e-experiment', 'hypothesis-a', 'experiment-a', 'depends-on'],
    ['edge-f-experiment', 'hypothesis-b', 'experiment-b', 'depends-on'],
  ].map(([id, fromId, toId, relation]) => ({
    schemaVersion: 1,
    id,
    fromId,
    toId,
    relation,
    authorId: 'researcher-a',
    createdAt,
  }));
  return {
    mechanisms: [mechanism],
    hypotheses,
    experiments,
    estimates: [],
    evidence,
    edges,
  };
}

/** @returns {string} A valid V2 portable bundle for viewer tests. */
function createBundleJson() {
  const exported = exportInterpretabilityResearchBundleV2(
    {
      evidenceGraph: createEvidenceGraph(),
      identityGraph: {
        components: [],
        activationPositions: [],
        observations: [],
        structuralConnections: [],
        circuitSnapshots: [],
      },
    },
    createSchemas()
  );
  if (!exported.valid) throw new Error('Atlas fixture bundle is invalid.');
  return exported.json;
}

/** @returns {void} Install only the static page elements used by the controller. */
function installPageElements() {
  document.body.innerHTML = `
    <input id="atlas-bundle-file" type="file" />
    <select id="atlas-mechanism"></select>
    <p id="atlas-status"></p>
    <p id="atlas-page-status"></p>
    <button id="atlas-previous"></button>
    <button id="atlas-next"></button>
    <div id="atlas-warnings"></div>
    <div id="atlas-hypotheses"></div>
    <div id="atlas-evidence"></div>
    <div id="atlas-experiments"></div>
    <div id="atlas-relationships"></div>
  `;
}

describe('Atlas portable bundle viewer', () => {
  it('imports a bundle and presents hypotheses, evidence, experiments, and polarity separately', () => {
    const viewer = createAtlasBundleViewer({
      schemas: createSchemas(),
      pageSize: 100,
      maxDepth: 2,
    });
    const imported = viewer.importBundle(createBundleJson());

    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(
      imported.bundle.evidenceGraph.mechanisms.map(record => record.id)
    ).toEqual(['mechanism-a']);
    const page = viewer.getContextPage(imported.bundle, 'mechanism-a');

    expect(page.valid).toBe(true);
    if (!page.valid) return;
    expect(page.hypotheses.map(record => record.id)).toEqual([
      'hypothesis-a',
      'hypothesis-b',
    ]);
    expect(page.evidence.map(record => record.kind)).toEqual([
      'negative',
      'observation',
    ]);
    expect(page.experiments.map(record => record.id)).toEqual([
      'experiment-a',
      'experiment-b',
    ]);
    expect(page.relationships.map(record => record.relation)).toEqual(
      expect.arrayContaining(['supports', 'contradicts'])
    );
  });

  it('imports V3 and V4 bundles through the core schema and lineage checks', () => {
    const schemas = createSchemas();
    const migrated = migrateNativeNeuronMechanismV1ToV2(mechanism, {
      mechanismSchemaV1: schemas.evidenceGraphSchemasV1.mechanismSchemaV1,
      nativeNeuronComponentSchemaV2:
        schemas.identityGraphSchemasV2.nativeNeuronComponentSchemaV2,
    });
    expect(migrated.valid).toBe(true);
    if (!migrated.valid) return;

    const bundle = {
      evidenceGraph: createEvidenceGraph(),
      identityGraph: {
        components: [migrated.component],
        activationPositions: [],
        observations: [],
        structuralConnections: [],
        circuitSnapshots: [],
      },
    };
    const v3 = exportInterpretabilityResearchBundleV3(bundle, schemas);
    const v4 = exportInterpretabilityResearchBundleV4(
      { ...bundle, accuracyEvaluations: [] },
      schemas
    );

    expect(v3.valid).toBe(true);
    expect(v4.valid).toBe(true);
    if (!v3.valid || !v4.valid) return;

    const viewer = createAtlasBundleViewer({ schemas });
    const importedV3 = viewer.importBundle(v3.json);
    const importedV4 = viewer.importBundle(v4.json);

    expect(importedV3.valid).toBe(true);
    expect(importedV4.valid).toBe(true);
    if (importedV4.valid) {
      expect(importedV4.bundle.accuracyEvaluations).toEqual([]);
    }
  });

  it('keeps relationship endpoints intact over bounded pages and rejects invalid bundles', () => {
    const viewer = createAtlasBundleViewer({
      schemas: createSchemas(),
      pageSize: 2,
      maxDepth: 2,
    });
    const imported = viewer.importBundle(createBundleJson());
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;

    let cursor = null;
    const seenIds = [];
    let page;
    do {
      page = viewer.getContextPage(imported.bundle, 'mechanism-a', cursor);
      expect(page.valid).toBe(true);
      if (!page.valid) return;
      page.relationships.forEach(edge => {
        expect(edge.fromId).toEqual(expect.any(String));
        expect(edge.toId).toEqual(expect.any(String));
      });
      seenIds.push(...page.items.map(item => item.id));
      cursor = page.nextCursor;
    } while (cursor);

    expect(new Set(seenIds).size).toBe(seenIds.length);
    expect(seenIds).toContain('edge-c-contradicts');
    expect(viewer.importBundle('{').valid).toBe(false);
    const tampered = JSON.parse(createBundleJson());
    tampered.evidenceGraph.mechanisms[0].neuronIndex = -1;
    expect(viewer.importBundle(JSON.stringify(tampered)).valid).toBe(false);
  });

  it('reads a selected file in memory, renders text safely, and does not persist it', async () => {
    installPageElements();
    const resolveSchemas = jest.fn(async () => createSchemas());
    const uploadedBundle = JSON.parse(createBundleJson());
    uploadedBundle.evidenceGraph.hypotheses[0].claim =
      '<img src=x onerror="alert(1)">';
    const selectedFile = {
      text: jest.fn(async () => JSON.stringify(uploadedBundle)),
    };
    Object.defineProperty(
      document.getElementById('atlas-bundle-file'),
      'files',
      {
        configurable: true,
        value: [selectedFile],
      }
    );
    const controller = createAtlasPageController({
      documentObj: document,
      resolveSchemas,
      pageSize: 100,
      maxDepth: 2,
    });
    controller.start();
    document
      .getElementById('atlas-bundle-file')
      .dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(selectedFile.text).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('#atlas-hypotheses article')).toHaveLength(
      2
    );
    expect(document.querySelector('#atlas-hypotheses').textContent).toContain(
      '<img src=x onerror="alert(1)">'
    );
    expect(document.querySelector('#atlas-hypotheses img')).toBeNull();
    expect(document.querySelector('#atlas-evidence').textContent).toContain(
      'negative'
    );
    expect(
      document.querySelector('#atlas-relationships').textContent
    ).toContain('contradicts');
    expect(resolveSchemas).toHaveBeenCalledTimes(1);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('precomputes circuit snapshot hashes with injected runtimes and rejects stale hashes', async () => {
    const z = createTestZod();
    const digest = async canonicalIdentity =>
      createHash('sha256').update(canonicalIdentity).digest('hex');
    const component = createNativeNeuronComponentV2(model, 'mlp', {
      layerIndex: 2,
      activationHook: 'blocks.2.mlp.post_activation',
      neuronIndex: 7,
    });
    const snapshot = await createCircuitStructuralSnapshotV2(
      'atlas:circuit:viewer-test',
      model,
      {
        completeness: 'complete',
        componentIds: [component.id],
        connectionIds: [],
        boundaryComponentIds: [component.id],
      },
      digest
    );
    const json = JSON.stringify({
      schemaVersion: 2,
      evidenceGraph: {
        schemaVersion: 1,
        mechanisms: [],
        hypotheses: [],
        experiments: [],
        estimates: [],
        evidence: [],
        edges: [],
      },
      identityGraph: {
        schemaVersion: 2,
        components: [component],
        activationPositions: [],
        observations: [],
        structuralConnections: [],
        circuitSnapshots: [snapshot],
      },
    });
    const resolveSchemas = createAtlasSchemaResolver({
      z,
      hashCanonicalIdentity: digest,
    });
    const schemas = await resolveSchemas(json);

    expect(importInterpretabilityResearchBundleV2(json, schemas).valid).toBe(
      true
    );
    const tampered = JSON.parse(json);
    tampered.identityGraph.circuitSnapshots[0].completeness = 'unknown';
    const tamperedJson = JSON.stringify(tampered);
    const tamperedSchemas = await resolveSchemas(tamperedJson);
    expect(
      importInterpretabilityResearchBundleV2(tamperedJson, tamperedSchemas)
        .valid
    ).toBe(false);
  });
});
