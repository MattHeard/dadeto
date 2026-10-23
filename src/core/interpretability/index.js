const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

/**
 * Construct the shared pinned model schema with a caller-provided Zod API.
 * @param {any} z Injected Zod namespace.
 * @returns {{commitRevision: any, pinnedModel: any}} Shared model schemas.
 */
function createPinnedModelSchema(z) {
  const commitRevision = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  const tokenizer = z
    .object({
      repository: z.string().url(),
      revision: commitRevision,
    })
    .strict()
    .optional();
  const trainingProgress = z
    .object({
      metric: z.string().min(1),
      value: z.number().nonnegative(),
    })
    .strict();
  const checkpoint = z
    .object({
      sha256: z.string().regex(SHA256_PATTERN),
      trainingRunId: z.string().min(1),
      trainingProgress: trainingProgress.optional(),
    })
    .strict()
    .optional();
  const pinnedModel = z
    .object({
      modelId: z.string().min(1),
      repository: z.string().url(),
      revision: commitRevision,
      architecture: z.string().min(1),
      checkpoint,
      tokenizer,
    })
    .strict();
  return { commitRevision, pinnedModel };
}

/**
 * Construct interpretability schemas with a caller-provided Zod API. Keeping
 * Zod outside core preserves core's dependency boundary while retaining Zod's
 * parsing and JSON Schema generation behavior.
 * @param {any} z Injected Zod namespace.
 * @returns {Record<string, any>} Runtime schemas and their JSON Schema forms.
 */
export function createInterpretabilitySchemasV1(z) {
  const schemaVersion = z.literal(1);
  const { commitRevision, pinnedModel } = createPinnedModelSchema(z);
  const mechanismBase = {
    schemaVersion,
    id: z.string().min(1),
    model: pinnedModel,
    layerIndex: z.number().int().nonnegative(),
    activationHook: z.string().min(1),
  };
  const sourceNeuron = {
    sourceId: z.string().min(1),
    neuronIndex: z.number().int().nonnegative(),
  };
  const authoredArtifact = {
    authorId: z.string().min(1),
    createdAt: z.iso.datetime(),
  };
  const artifactSha256 = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional();
  /**
   * Create a strict versioned record with shared authorship fields.
   * @param {Record<string, any>} fields Record-specific schema fields.
   * @returns {any} Injected schema-builder object schema.
   */
  const authoredRecord = fields =>
    z.object({ ...fields, ...authoredArtifact }).strict();
  const evidenceIds = z.array(z.string().min(1));
  const procedureReference = z
    .object({
      repository: z.string().url(),
      revision: commitRevision,
      path: z.string().min(1),
    })
    .strict();

  const causalInterventionNotTestedSchemaV1 = z
    .object({
      schemaVersion,
      status: z.literal('not-tested'),
      reason: z.string().min(1).optional(),
    })
    .strict();
  const causalInterventionTestedSchemaV1 = z
    .object({
      schemaVersion,
      status: z.literal('tested'),
      targetMechanismId: z.string().min(1),
      operation: z.literal('set-activation-zero'),
      timeStepIndex: z.number().int().min(0).max(9),
      inputSequenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
      predictedOutputIndex: z.number().int().min(0).max(9),
      baselineOutputIndex: z.number().int().min(0).max(9),
      intervenedOutputIndex: z.number().int().min(0).max(9),
      causalScore: z.number().int().min(0).max(1),
      artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict()
    .refine(
      /**
       * @param {{causalScore: number, predictedOutputIndex: number, intervenedOutputIndex: number}} result Tested causal result.
       * @returns {boolean} Whether the binary score matches the observed output.
       */
      result =>
        result.causalScore ===
        (result.predictedOutputIndex === result.intervenedOutputIndex ? 1 : 0),
      {
        message: 'causal score must match the predicted and intervened outputs',
      }
    );
  const causalInterventionResultSchemaV1 = z.discriminatedUnion('status', [
    causalInterventionNotTestedSchemaV1,
    causalInterventionTestedSchemaV1,
  ]);

  /**
   * Build one discriminated mechanism branch.
   * @param {string} kind Mechanism discriminator.
   * @param {Record<string, any>} identity Kind-specific properties.
   * @returns {any} Strict Zod object schema.
   */
  const defineMechanism = (kind, identity) =>
    z.object({ ...mechanismBase, kind: z.literal(kind), ...identity }).strict();
  const mechanismSchemaV1 = z.discriminatedUnion('kind', [
    defineMechanism('native-neuron', sourceNeuron),
    defineMechanism('sae-feature', {
      sourceId: z.string().min(1),
      featureIndex: z.number().int().nonnegative(),
    }),
    defineMechanism('attention-head', {
      headIndex: z.number().int().nonnegative(),
    }),
    defineMechanism('recurrent-state', {
      ...sourceNeuron,
      timeStep: z.number().int().nonnegative(),
    }),
  ]);

  const hypothesisSchemaV1 = authoredRecord({
    schemaVersion,
    id: z.string().min(1),
    revision: z.number().int().positive(),
    claim: z.string().min(1),
    status: z.enum(['proposed', 'reviewed', 'reproduced', 'rejected']),
    mechanismIds: z.array(z.string().min(1)).min(1),
    evidenceIds,
    confidence: z.number().min(0).max(1).optional(),
  });

  const observation = z
    .object({
      kind: z.enum(['observed', 'null', 'negative', 'contradictory']),
      summary: z.string().min(1),
      artifactSha256,
    })
    .strict();
  const experimentSchemaV1 = authoredRecord({
    schemaVersion,
    id: z.string().min(1),
    status: z.enum(['registered', 'completed', 'failed']),
    model: pinnedModel,
    mechanismIds: z.array(z.string().min(1)).min(1),
    hypothesisIds: z.array(z.string().min(1)),
    procedure: procedureReference,
    seed: z.number().int().nonnegative(),
    inputSplitId: z.string().min(1),
    runtime: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean()])
    ),
    predictions: z
      .array(
        z
          .object({ target: z.string().min(1), expected: z.string().min(1) })
          .strict()
      )
      .min(1),
    observations: z.array(observation),
    causalInterventionResult: causalInterventionResultSchemaV1.optional(),
  }).refine(
    /**
     * @param {{mechanismIds: Array<string>, causalInterventionResult?: {status: 'not-tested', reason?: string}|{status: 'tested', targetMechanismId: string}}} experiment Experiment record being validated.
     * @returns {boolean} Whether a tested intervention targets one of its mechanisms.
     */
    experiment =>
      experiment.causalInterventionResult?.status !== 'tested' ||
      experiment.mechanismIds.includes(
        experiment.causalInterventionResult.targetMechanismId
      ),
    { message: 'causal intervention target must be linked to the experiment' }
  );

  const evidenceSchemaV1 = authoredRecord({
    schemaVersion,
    id: z.string().min(1),
    kind: z.enum([
      'prediction',
      'observation',
      'null',
      'negative',
      'contradictory',
    ]),
    summary: z.string().min(1),
    mechanismIds: z.array(z.string().min(1)),
    hypothesisIds: z.array(z.string().min(1)),
    experimentIds: z.array(z.string().min(1)),
    artifactSha256,
    validationState: z.enum([
      'unreviewed',
      'reviewed',
      'reproduced',
      'rejected',
    ]),
  });

  const evidenceEdgeSchemaV1 = authoredRecord({
    schemaVersion,
    id: z.string().min(1),
    fromId: z.string().min(1),
    toId: z.string().min(1),
    relation: z.enum([
      'depends-on',
      'supports',
      'contradicts',
      'projects-to',
      'connected-to',
    ]),
  });

  const uncertainty = z
    .object({
      lower: z.number(),
      upper: z.number(),
      method: z.string().min(1),
    })
    .strict()
    .refine(
      /**
       * @param {{ lower: number, upper: number }} value Uncertainty range.
       * @returns {boolean} Whether the lower bound does not exceed the upper bound.
       */
      value => value.lower <= value.upper,
      {
        message: 'uncertainty lower bound must not exceed upper bound',
      }
    );
  const mechanisticEstimateSchemaV1 = z.strictObject({
    schemaVersion,
    id: z.string().min(1),
    model: pinnedModel,
    metric: z
      .object({
        name: z.literal('accuracy'),
        value: z.number().min(0).max(1),
      })
      .strict(),
    uncertainty,
    compute: z
      .object({ quantity: z.number().positive(), unit: z.string().min(1) })
      .strict(),
    method: procedureReference,
    assumptions: z.array(z.string().min(1)).min(1),
    hypothesisIds: z.array(z.string().min(1)),
    evidenceIds,
    heldOutSplitId: z.string().min(1),
    ...authoredArtifact,
  });

  const accuracyValue = z.number().min(0).max(1);
  const meanSquaredError = z.number().min(0);
  const noiseScale = z.union([
    z.literal(0.01),
    z.literal(0.05),
    z.literal(0.1),
    z.literal(0.2),
  ]);
  const accuracyVariantReportSchemaV1 = z.strictObject({
    variantId: z.string().min(1),
    heldOutSplitId: z.string().min(1),
    noiseScale,
    referenceAccuracy: accuracyValue,
    mechanisticEstimate: accuracyValue,
    samplingEstimate: accuracyValue,
    mechanisticCompute: z.number().positive(),
    samplingCompute: z.number().positive(),
  });
  const accuracyEvaluationReportSchemaV1 = z.strictObject({
    schemaVersion,
    protocolVersion: z.literal('1.0.0'),
    heldOutSplitId: z.string().min(1),
    sampleCountPerVariant: z.literal(100000),
    variantCount: z.literal(32),
    samplingBaseline: z
      .object({
        method: procedureReference,
        seedCommitment: z.string().regex(SHA256_PATTERN),
      })
      .strict(),
    variants: z.array(accuracyVariantReportSchemaV1).min(32),
    overall: z
      .object({
        mechanisticMse: meanSquaredError,
        samplingMse: meanSquaredError,
      })
      .strict(),
    byNoiseScale: z
      .array(
        z
          .object({
            noiseScale,
            variantCount: z.literal(8),
            mechanisticMse: meanSquaredError,
            samplingMse: meanSquaredError,
          })
          .strict()
      )
      .min(4),
    referenceAccuracyRange: z
      .object({
        minimum: accuracyValue,
        maximum: accuracyValue,
        spread: accuracyValue,
      })
      .strict(),
    materialVariationMet: z.boolean(),
  });
  const accuracyEvaluationSchemaV1 = authoredRecord({
    schemaVersion,
    id: z.string().min(1),
    estimateLinks: z
      .array(
        z
          .object({
            variantId: z.string().min(1),
            estimateId: z.string().min(1),
          })
          .strict()
      )
      .min(32),
    report: accuracyEvaluationReportSchemaV1,
  });

  return Object.freeze({
    mechanismSchemaV1,
    hypothesisSchemaV1,
    experimentSchemaV1,
    causalInterventionResultSchemaV1,
    evidenceSchemaV1,
    evidenceEdgeSchemaV1,
    mechanisticEstimateSchemaV1,
    accuracyEvaluationSchemaV1,
    interpretabilityJsonSchemasV1: Object.freeze({
      mechanism: z.toJSONSchema(mechanismSchemaV1),
      hypothesis: z.toJSONSchema(hypothesisSchemaV1),
      experiment: z.toJSONSchema(experimentSchemaV1),
      causalInterventionResult: z.toJSONSchema(
        causalInterventionResultSchemaV1
      ),
      evidence: z.toJSONSchema(evidenceSchemaV1),
      evidenceEdge: z.toJSONSchema(evidenceEdgeSchemaV1),
      mechanisticEstimate: z.toJSONSchema(mechanisticEstimateSchemaV1),
      accuracyEvaluation: z.toJSONSchema(accuracyEvaluationSchemaV1),
    }),
  });
}

/**
 * Construct strict schemas for stable recurrent neuron and activation identities.
 * @param {any} z Injected Zod namespace.
 * @param {(canonicalIdentity: string) => string} [hashCanonicalIdentity] Synchronous digest adapter for circuit snapshot validation.
 * @returns {Record<string, any>} V2 runtime schemas and JSON Schema forms.
 */
export function createInterpretabilitySchemasV2(z, hashCanonicalIdentity) {
  const schemaVersion = z.literal(2);
  const { pinnedModel } = createPinnedModelSchema(z);
  const recurrentNeuronComponentSchemaV2 = z
    .object({
      schemaVersion,
      id: z.string().regex(/^atlas:v2:component:/),
      coordinateId: z.string().regex(/^atlas:v2:component-coordinate:/),
      kind: z.literal('recurrent-neuron'),
      model: pinnedModel,
      sourceId: z.string().min(1),
      layerIndex: z.number().int().nonnegative(),
      activationHook: z.string().min(1),
      neuronIndex: z.number().int().nonnegative(),
    })
    .strict()
    .refine(
      /**
       * @param {Record<string, any>} component Component to validate.
       * @returns {boolean} Whether both IDs match their structured identity.
       */
      component => {
        const expected = recurrentNeuronComponentIdentities(component);
        return (
          component.id === expected.id &&
          component.coordinateId === expected.coordinateId
        );
      }
    );
  const nativeNeuronComponentSchemaV2 = z
    .object({
      schemaVersion,
      id: z.string().regex(/^atlas:v2:component:/),
      coordinateId: z.string().regex(/^atlas:v2:component-coordinate:/),
      kind: z.literal('native-neuron'),
      model: pinnedModel,
      sourceId: z.string().min(1),
      layerIndex: z.number().int().nonnegative(),
      activationHook: z.string().min(1),
      neuronIndex: z.number().int().nonnegative(),
    })
    .strict()
    .refine(
      /**
       * @param {Record<string, any>} component Component to validate.
       * @returns {boolean} Whether both IDs match their structured identity.
       */
      component => {
        const expected = nativeNeuronComponentIdentities(component);
        return (
          component.id === expected.id &&
          component.coordinateId === expected.coordinateId
        );
      }
    );
  const recurrentActivationPositionSchemaV2 = z
    .object({
      schemaVersion,
      id: z.string().regex(/^atlas:v2:position:/),
      componentId: z.string().regex(/^atlas:v2:component:/),
      timeStepIndex: z.number().int().nonnegative(),
    })
    .strict()
    .refine(
      /**
       * @param {{id: string, componentId: string, timeStepIndex: number}} position Position to validate.
       * @returns {boolean} Whether the position ID matches its identity.
       */
      position => position.id === recurrentActivationPositionId(position)
    );
  const tokenActivationPositionSchemaV2 = z
    .object({
      schemaVersion,
      id: z.string().regex(/^atlas:v2:position:/),
      componentId: z.string().regex(/^atlas:v2:component:/),
      kind: z.literal('token'),
      tokenPositionIndex: z.number().int().nonnegative(),
    })
    .strict()
    .refine(
      /**
       * @param {{id: string, componentId: string, tokenPositionIndex: number}} position Position to validate.
       * @returns {boolean} Whether the position ID matches its identity.
       */
      position => position.id === tokenActivationPositionId(position)
    );
  const activationObservationSchemaV2 = z
    .object({
      schemaVersion,
      id: z.string().regex(/^atlas:v2:observation:/),
      activationPositionId: z.string().regex(/^atlas:v2:position:/),
      experimentId: z.string().min(1),
      inputSequenceId: z.string().min(1),
      runId: z.string().min(1),
      value: z.number(),
      numericPrecision: z.enum(['float16', 'bfloat16', 'float32', 'float64']),
      tokenId: z.number().int().nonnegative().optional(),
    })
    .strict()
    .refine(
      /**
       * @param {{id: string, activationPositionId: string, experimentId: string, inputSequenceId: string, runId: string}} observation Observation to validate.
       * @returns {boolean} Whether the observation ID matches its identity.
       */
      observation => observation.id === activationObservationId(observation)
    );
  const structuralConnectionSchemaV2 = z
    .object({
      schemaVersion,
      id: z.string().regex(/^atlas:v2:connection:/),
      coordinateId: z.string().regex(/^atlas:v2:connection-coordinate:/),
      model: pinnedModel,
      sourceComponentId: z.string().regex(/^atlas:v2:component:/),
      sourceCoordinateId: z.string().regex(/^atlas:v2:component-coordinate:/),
      sourcePort: z.string().min(1),
      targetComponentId: z.string().regex(/^atlas:v2:component:/),
      targetCoordinateId: z.string().regex(/^atlas:v2:component-coordinate:/),
      targetPort: z.string().min(1),
      kind: z.enum(['dense', 'recurrent', 'attention', 'convolution', 'other']),
      recurrentLag: z.number().int().nonnegative().optional(),
      tensorCoordinate: z.array(z.number().int().nonnegative()).optional(),
    })
    .strict()
    .refine(
      /**
       * @param {Record<string, any>} connection Connection to validate.
       * @returns {boolean} Whether both IDs match their structured identity.
       */
      connection => {
        const expected = structuralConnectionIdentities(connection);
        return (
          connection.id === expected.id &&
          connection.coordinateId === expected.coordinateId
        );
      }
    );
  const circuitStructuralSnapshotSchemaV2 = z
    .object({
      schemaVersion,
      id: z.string().regex(/^atlas:v2:circuit-snapshot:[a-f0-9]{64}$/),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      circuitId: z.string().regex(/^atlas:circuit:/),
      model: pinnedModel,
      completeness: z.enum(['complete', 'unknown']),
      componentIds: z.array(z.string().regex(/^atlas:v2:component:/)).min(1),
      connectionIds: z.array(z.string().regex(/^atlas:v2:connection:/)),
      boundaryComponentIds: z.array(z.string().regex(/^atlas:v2:component:/)),
    })
    .strict()
    .refine(
      /**
       * @param {{id: string, contentHash: string}} snapshot Snapshot to validate.
       * @returns {boolean} Whether the snapshot ID matches its digest.
       */
      snapshot => snapshot.id === circuitSnapshotId(snapshot.contentHash)
    );

  const identityGraphSchemaV2 = createIdentityGraphSchemaV2(
    z,
    {
      recurrentNeuronComponentSchemaV2,
      nativeNeuronComponentSchemaV2,
      recurrentActivationPositionSchemaV2,
      tokenActivationPositionSchemaV2,
      activationObservationSchemaV2,
      structuralConnectionSchemaV2,
      circuitStructuralSnapshotSchemaV2,
    },
    hashCanonicalIdentity
  );

  return Object.freeze({
    identityReferenceSchemaV1: createIdentityReferenceSchemaV1(z),
    recurrentNeuronComponentSchemaV2,
    nativeNeuronComponentSchemaV2,
    recurrentActivationPositionSchemaV2,
    tokenActivationPositionSchemaV2,
    activationObservationSchemaV2,
    structuralConnectionSchemaV2,
    circuitStructuralSnapshotSchemaV2,
    identityGraphSchemaV2,
    interpretabilityJsonSchemasV2: Object.freeze({
      recurrentNeuronComponent: z.toJSONSchema(
        recurrentNeuronComponentSchemaV2
      ),
      nativeNeuronComponent: z.toJSONSchema(nativeNeuronComponentSchemaV2),
      recurrentActivationPosition: z.toJSONSchema(
        recurrentActivationPositionSchemaV2
      ),
      tokenActivationPosition: z.toJSONSchema(tokenActivationPositionSchemaV2),
      activationObservation: z.toJSONSchema(activationObservationSchemaV2),
      structuralConnection: z.toJSONSchema(structuralConnectionSchemaV2),
      circuitStructuralSnapshot: z.toJSONSchema(
        circuitStructuralSnapshotSchemaV2
      ),
      identityGraph: z.toJSONSchema(identityGraphSchemaV2),
    }),
  });
}

/**
 * Build the injected parser for portable V2 identity graph envelopes.
 * @param {Record<string, any>} z Injected Zod-compatible API.
 * @param {Record<string, any>} schemas V2 record schemas.
 * @param {(canonicalIdentity: string) => string} [hashCanonicalIdentity] Synchronous digest adapter.
 * @returns {any} Strict identity graph schema.
 */
function createIdentityGraphSchemaV2(z, schemas, hashCanonicalIdentity) {
  return z
    .object({
      schemaVersion: z.literal(2),
      components: z.array(
        z.union([
          schemas.recurrentNeuronComponentSchemaV2,
          schemas.nativeNeuronComponentSchemaV2,
        ])
      ),
      activationPositions: z.array(
        z.union([
          schemas.recurrentActivationPositionSchemaV2,
          schemas.tokenActivationPositionSchemaV2,
        ])
      ),
      observations: z.array(schemas.activationObservationSchemaV2),
      structuralConnections: z.array(schemas.structuralConnectionSchemaV2),
      circuitSnapshots: z.array(schemas.circuitStructuralSnapshotSchemaV2),
    })
    .strict()
    .refine(
      /**
       * @param {Record<string, any>} graph Parsed V2 graph.
       * @returns {boolean} Whether graph relationships are canonical.
       */
      graph => identityGraphIsCanonical(graph, hashCanonicalIdentity)
    );
}

/**
 * Serialize the canonical tuple used to derive a V2 circuit snapshot digest.
 * @param {Record<string, any>} model Pinned model identity.
 * @param {Record<string, any>} structure Circuit members and boundaries.
 * @returns {string} Canonical JSON tuple.
 */
function canonicalCircuitSnapshotIdentity(model, structure) {
  return JSON.stringify([
    2,
    model.modelId,
    model.repository,
    model.revision,
    model.architecture,
    structure.completeness,
    [...structure.componentIds].sort(),
    [...structure.connectionIds].sort(),
    [...structure.boundaryComponentIds].sort(),
  ]);
}

/**
 * Check the relational identity rules used by the injected graph schema.
 * @param {Record<string, any>} graph Parsed V2 identity graph.
 * @param {(canonicalIdentity: string) => string} [hashCanonicalIdentity] Synchronous digest adapter.
 * @returns {boolean} Whether graph identities and links are coherent.
 */
function identityGraphIsCanonical(graph, hashCanonicalIdentity) {
  const components = new Map(
    graph.components.map(
      /**
       * @param {Record<string, any>} component Component record.
       * @returns {[string, Record<string, any>]} Map entry.
       */
      component => [component.id, component]
    )
  );
  const positions = new Map(
    graph.activationPositions.map(
      /**
       * @param {Record<string, any>} position Activation position.
       * @returns {[string, Record<string, any>]} Map entry.
       */
      position => [position.id, position]
    )
  );
  const connections = new Map(
    graph.structuralConnections.map(
      /**
       * @param {Record<string, any>} connection Structural connection.
       * @returns {[string, Record<string, any>]} Map entry.
       */
      connection => [connection.id, connection]
    )
  );
  return (
    graphHasUniqueRecordIds(graph) &&
    graphHasCanonicalReferences(graph, components, positions) &&
    connectionsHaveCanonicalEndpoints(
      graph.structuralConnections,
      components
    ) &&
    snapshotsHaveCanonicalIdentity(
      graph.circuitSnapshots,
      components,
      connections,
      hashCanonicalIdentity
    )
  );
}

/**
 * Check every identity graph collection for duplicate IDs.
 * @param {Record<string, any>} graph V2 identity graph.
 * @returns {boolean} Whether all record IDs are unique.
 */
function graphHasUniqueRecordIds(graph) {
  const records = [
    ...graph.components,
    ...graph.activationPositions,
    ...graph.observations,
    ...graph.structuralConnections,
    ...graph.circuitSnapshots,
  ];
  return (
    new Set(
      records.map(
        /**
         * @param {Record<string, any>} record Identity record.
         * @returns {string} Record ID.
         */
        record => record.id
      )
    ).size === records.length
  );
}

/**
 * Check activation-position and observation references.
 * @param {Record<string, any>} graph V2 identity graph.
 * @param {Map<string, Record<string, any>>} components Components by ID.
 * @param {Map<string, Record<string, any>>} positions Activation positions by ID.
 * @returns {boolean} Whether every reference resolves.
 */
function graphHasCanonicalReferences(graph, components, positions) {
  return (
    graph.activationPositions.every(
      /**
       * @param {Record<string, any>} position Activation position.
       * @returns {boolean} Whether its component exists.
       */
      position => components.has(position.componentId)
    ) &&
    graph.observations.every(
      /**
       * @param {Record<string, any>} observation Activation observation.
       * @returns {boolean} Whether its position exists.
       */
      observation => positions.has(observation.activationPositionId)
    )
  );
}

/**
 * Check connection endpoints against component coordinates and checkpoints.
 * @param {Array<Record<string, any>>} connections Structural connections.
 * @param {Map<string, Record<string, any>>} components Components by ID.
 * @returns {boolean} Whether every endpoint matches its component identity.
 */
function connectionsHaveCanonicalEndpoints(connections, components) {
  return connections.every(connection => {
    const source = components.get(connection.sourceComponentId);
    const target = components.get(connection.targetComponentId);
    if (!source || !target) return false;
    return (
      source.coordinateId === connection.sourceCoordinateId &&
      pinnedModelIdentity(source.model) ===
        pinnedModelIdentity(connection.model) &&
      target.coordinateId === connection.targetCoordinateId &&
      pinnedModelIdentity(target.model) ===
        pinnedModelIdentity(connection.model)
    );
  });
}

/**
 * Check circuit membership and snapshot digests with the injected hash adapter.
 * @param {Array<Record<string, any>>} snapshots Circuit snapshots.
 * @param {Map<string, Record<string, any>>} components Components by ID.
 * @param {Map<string, Record<string, any>>} connections Connections by ID.
 * @param {(canonicalIdentity: string) => string} [hashCanonicalIdentity] Digest adapter.
 * @returns {boolean} Whether every snapshot matches its listed identities.
 */
function snapshotsHaveCanonicalIdentity(
  snapshots,
  components,
  connections,
  hashCanonicalIdentity
) {
  if (snapshots.length === 0) return true;
  if (typeof hashCanonicalIdentity !== 'function') return false;
  try {
    return snapshots.every(
      /**
       * @param {Record<string, any>} snapshot Circuit snapshot.
       * @returns {boolean} Whether the snapshot matches its identities.
       */
      snapshot =>
        snapshotHasCanonicalIdentity(
          snapshot,
          components,
          connections,
          hashCanonicalIdentity
        )
    );
  } catch {
    return false;
  }
}

/**
 * Check one snapshot's members, checkpoint identity, and content digest.
 * @param {Record<string, any>} snapshot Circuit snapshot.
 * @param {Map<string, Record<string, any>>} components Components by ID.
 * @param {Map<string, Record<string, any>>} connections Connections by ID.
 * @param {(canonicalIdentity: string) => string} hashCanonicalIdentity Digest adapter.
 * @returns {boolean} Whether all members and digest match.
 */
function snapshotHasCanonicalIdentity(
  snapshot,
  components,
  connections,
  hashCanonicalIdentity
) {
  const memberComponents = /** @type {Array<Record<string, any>|undefined>} */ (
    snapshot.componentIds.map(
      /**
       * @param {string} id Component identity.
       * @returns {Record<string, any>|undefined} Referenced component.
       */
      id => components.get(id)
    )
  );
  const memberConnections =
    /** @type {Array<Record<string, any>|undefined>} */ (
      snapshot.connectionIds.map(
        /**
         * @param {string} id Connection identity.
         * @returns {Record<string, any>|undefined} Referenced connection.
         */
        id => connections.get(id)
      )
    );
  const hasMissingMember =
    memberComponents.some(component => !component) ||
    memberConnections.some(connection => !connection);
  const hasInvalidBoundary = snapshot.boundaryComponentIds.some(
    /**
     * @param {string} id Boundary component identity.
     * @returns {boolean} Whether the boundary is absent from the circuit.
     */
    id => !snapshot.componentIds.includes(id)
  );
  if (
    hasMissingMember ||
    hasInvalidBoundary ||
    !membersMatchSnapshotModel(memberComponents, memberConnections, snapshot)
  )
    return false;
  return (
    hashCanonicalIdentity(
      canonicalCircuitSnapshotIdentity(snapshot.model, snapshot)
    ) === snapshot.contentHash
  );
}

/**
 * Check that every component and connection uses the snapshot checkpoint.
 * @param {Array<Record<string, any>|undefined>} components Snapshot components.
 * @param {Array<Record<string, any>|undefined>} connections Snapshot connections.
 * @param {Record<string, any>} snapshot Circuit snapshot.
 * @returns {boolean} Whether the model identities agree.
 */
function membersMatchSnapshotModel(components, connections, snapshot) {
  return (
    components.every(
      component =>
        component &&
        pinnedModelIdentity(component.model) ===
          pinnedModelIdentity(snapshot.model)
    ) &&
    connections.every(
      connection =>
        connection &&
        pinnedModelIdentity(connection.model) ===
          pinnedModelIdentity(snapshot.model)
    )
  );
}

/**
 * Encode the checkpoint fields that define model identity.
 * @param {Record<string, any>} model Pinned model.
 * @returns {string} Canonical model identity.
 */
function pinnedModelIdentity(model) {
  const trainingRunIdentity = model.checkpoint?.trainingRunId
    ? ['training-run', model.checkpoint.trainingRunId]
    : [];
  const checkpointIdentity = model.checkpoint?.sha256
    ? ['checkpoint-sha256', model.checkpoint.sha256]
    : [];
  return JSON.stringify([
    model.modelId,
    model.repository,
    model.revision,
    model.architecture,
    ...trainingRunIdentity,
    ...checkpointIdentity,
    model.tokenizer?.repository,
    model.tokenizer?.revision,
  ]);
}

/**
 * Encode an ordered, versioned identity tuple as a stable public identifier.
 * @param {string} category Identity category.
 * @param {Array<string|number>} identity Canonically ordered identity fields.
 * @returns {string} Namespaced deterministic identifier.
 */
function canonicalIdentityId(category, identity) {
  return `atlas:v2:${category}:${encodeURIComponent(JSON.stringify(identity))}`;
}

/**
 * Derive both checkpoint-specific and longitudinal recurrent component IDs.
 * @param {Record<string, any>} component Component fields.
 * @returns {{id: string, coordinateId: string}} Canonical component identities.
 */
function recurrentNeuronComponentIdentities(component) {
  const trainingRunIdentity = component.model.checkpoint?.trainingRunId
    ? ['training-run', component.model.checkpoint.trainingRunId]
    : [];
  const checkpointIdentity = component.model.checkpoint?.sha256
    ? ['checkpoint-sha256', component.model.checkpoint.sha256]
    : [];
  const coordinateIdentity = [
    component.model.modelId,
    component.model.repository,
    component.model.architecture,
    ...trainingRunIdentity,
    component.sourceId,
    component.layerIndex,
    component.activationHook,
    component.neuronIndex,
  ];
  return {
    id: canonicalIdentityId('component', [
      component.model.modelId,
      component.model.repository,
      component.model.revision,
      ...trainingRunIdentity,
      ...checkpointIdentity,
      component.model.architecture,
      component.sourceId,
      component.layerIndex,
      component.activationHook,
      component.neuronIndex,
    ]),
    coordinateId: canonicalIdentityId(
      'component-coordinate',
      coordinateIdentity
    ),
  };
}

/**
 * Derive checkpoint-specific and longitudinal native-neuron component IDs.
 * @param {Record<string, any>} component Native component fields.
 * @returns {{id: string, coordinateId: string}} Canonical component identities.
 */
function nativeNeuronComponentIdentities(component) {
  const trainingRunIdentity = component.model.checkpoint?.trainingRunId
    ? ['training-run', component.model.checkpoint.trainingRunId]
    : [];
  const checkpointIdentity = component.model.checkpoint?.sha256
    ? ['checkpoint-sha256', component.model.checkpoint.sha256]
    : [];
  const coordinateIdentity = [
    'native-neuron',
    component.model.modelId,
    component.model.repository,
    component.model.architecture,
    ...trainingRunIdentity,
    component.sourceId,
    component.layerIndex,
    component.activationHook,
    component.neuronIndex,
  ];
  return {
    id: canonicalIdentityId('component', [
      'native-neuron',
      component.model.modelId,
      component.model.repository,
      component.model.revision,
      ...trainingRunIdentity,
      ...checkpointIdentity,
      component.model.architecture,
      component.sourceId,
      component.layerIndex,
      component.activationHook,
      component.neuronIndex,
    ]),
    coordinateId: canonicalIdentityId(
      'component-coordinate',
      coordinateIdentity
    ),
  };
}

/**
 * Derive one recurrent activation position ID.
 * @param {{componentId: string, timeStepIndex: number}} position Position fields.
 * @returns {string} Canonical position ID.
 */
function recurrentActivationPositionId(position) {
  return canonicalIdentityId('position', [
    position.componentId,
    position.timeStepIndex,
  ]);
}

/**
 * Derive one token activation position ID.
 * @param {{componentId: string, tokenPositionIndex: number}} position Position fields.
 * @returns {string} Canonical token position ID.
 */
function tokenActivationPositionId(position) {
  return canonicalIdentityId('position', [
    position.componentId,
    'token',
    position.tokenPositionIndex,
  ]);
}

/**
 * Derive one input- and run-specific observation ID.
 * @param {{activationPositionId: string, experimentId: string, inputSequenceId: string, runId: string}} observation Observation fields.
 * @returns {string} Canonical observation ID.
 */
function activationObservationId(observation) {
  return canonicalIdentityId('observation', [
    observation.activationPositionId,
    observation.experimentId,
    observation.inputSequenceId,
    observation.runId,
  ]);
}

/**
 * Derive checkpoint-specific and longitudinal structural connection IDs.
 * @param {Record<string, any>} connection Connection fields.
 * @returns {{id: string, coordinateId: string}} Canonical connection identities.
 */
function structuralConnectionIdentities(connection) {
  return {
    id: canonicalIdentityId('connection', [
      connection.model.modelId,
      connection.model.repository,
      connection.model.revision,
      connection.model.architecture,
      connection.sourceComponentId,
      connection.sourcePort,
      connection.targetComponentId,
      connection.targetPort,
      connection.kind,
      connection.recurrentLag ?? null,
      connection.tensorCoordinate ?? null,
    ]),
    coordinateId: canonicalIdentityId('connection-coordinate', [
      connection.model.modelId,
      connection.model.repository,
      connection.model.architecture,
      connection.sourceCoordinateId,
      connection.sourcePort,
      connection.targetCoordinateId,
      connection.targetPort,
      connection.kind,
      connection.recurrentLag ?? null,
      connection.tensorCoordinate ?? null,
    ]),
  };
}

/**
 * Derive a circuit snapshot ID from its injected digest.
 * @param {string} contentHash Canonical snapshot digest.
 * @returns {string} Canonical snapshot ID.
 */
function circuitSnapshotId(contentHash) {
  return `atlas:v2:circuit-snapshot:${contentHash}`;
}

/**
 * Derive the stable ID for a recurrent hidden-neuron component.
 * @param {Record<string, any>} model Pinned model and checkpoint identity.
 * @param {string} sourceId Source-local neuron namespace.
 * @param {{layerIndex: number, activationHook: string, neuronIndex: number}} coordinates Neuron coordinates.
 * @returns {Record<string, any>} Versioned recurrent component record.
 */
export function createRecurrentNeuronComponentV2(model, sourceId, coordinates) {
  const identities = recurrentNeuronComponentIdentities({
    model,
    sourceId,
    ...coordinates,
  });
  return {
    schemaVersion: 2,
    ...identities,
    kind: 'recurrent-neuron',
    model,
    sourceId,
    layerIndex: coordinates.layerIndex,
    activationHook: coordinates.activationHook,
    neuronIndex: coordinates.neuronIndex,
  };
}

/**
 * Derive the stable ID for a native hidden-neuron component.
 * @param {Record<string, any>} model Pinned model and checkpoint identity.
 * @param {string} sourceId Source-local neuron namespace.
 * @param {{layerIndex: number, activationHook: string, neuronIndex: number}} coordinates Neuron coordinates.
 * @returns {Record<string, any>} Versioned native-neuron component record.
 */
export function createNativeNeuronComponentV2(model, sourceId, coordinates) {
  const identities = nativeNeuronComponentIdentities({
    model,
    sourceId,
    ...coordinates,
  });
  return {
    schemaVersion: 2,
    ...identities,
    kind: 'native-neuron',
    model,
    sourceId,
    layerIndex: coordinates.layerIndex,
    activationHook: coordinates.activationHook,
    neuronIndex: coordinates.neuronIndex,
  };
}

/**
 * Derive a stable ID for a component's zero-based recurrent activation position.
 * @param {{componentId: string, timeStepIndex: number}} identity Position coordinates.
 * @returns {Record<string, any>} Versioned recurrent position record.
 */
export function createRecurrentActivationPositionV2({
  componentId,
  timeStepIndex,
}) {
  return {
    schemaVersion: 2,
    id: recurrentActivationPositionId({ componentId, timeStepIndex }),
    componentId,
    timeStepIndex,
  };
}

/**
 * Derive a stable ID for a component's zero-based token activation position.
 * @param {{componentId: string, tokenPositionIndex: number}} identity Position coordinates.
 * @returns {Record<string, any>} Versioned token position record.
 */
export function createTokenActivationPositionV2({
  componentId,
  tokenPositionIndex,
}) {
  return {
    schemaVersion: 2,
    id: tokenActivationPositionId({ componentId, tokenPositionIndex }),
    componentId,
    kind: 'token',
    tokenPositionIndex,
  };
}

/**
 * Derive a stable ID for one input- and run-specific activation measurement.
 * @param {string} activationPositionId Recurrent position identity.
 * @param {string} experimentId Experiment identity.
 * @param {{inputSequenceId: string, runId: string, value: number, numericPrecision: string, tokenId?: number}} measurement Input-specific measured value and run identity.
 * @returns {Record<string, any>} Versioned activation observation.
 */
export function createActivationObservationV2(
  activationPositionId,
  experimentId,
  measurement
) {
  return {
    schemaVersion: 2,
    id: activationObservationId({
      activationPositionId,
      experimentId,
      inputSequenceId: measurement.inputSequenceId,
      runId: measurement.runId,
    }),
    activationPositionId,
    experimentId,
    inputSequenceId: measurement.inputSequenceId,
    runId: measurement.runId,
    value: measurement.value,
    numericPrecision: measurement.numericPrecision,
    ...(measurement.tokenId === undefined
      ? {}
      : { tokenId: measurement.tokenId }),
  };
}

/**
 * Derive checkpoint-specific and longitudinal structural connection IDs.
 * @param {Record<string, any>} model Pinned model and checkpoint identity.
 * @param {Record<string, any>} sourceComponent Directed source component.
 * @param {Record<string, any>} targetComponent Directed target component.
 * @param {Record<string, any>} connection Directed endpoint and operation coordinates.
 * @returns {Record<string, any>} Versioned structural connection record.
 */
export function createStructuralConnectionV2(
  model,
  sourceComponent,
  targetComponent,
  connection
) {
  const connectionFields = {
    model,
    sourceComponentId: sourceComponent.id,
    sourceCoordinateId: sourceComponent.coordinateId,
    sourcePort: connection.sourcePort,
    targetComponentId: targetComponent.id,
    targetCoordinateId: targetComponent.coordinateId,
    targetPort: connection.targetPort,
    kind: connection.kind,
    recurrentLag: connection.recurrentLag,
    tensorCoordinate: connection.tensorCoordinate,
  };
  return {
    schemaVersion: 2,
    ...structuralConnectionIdentities(connectionFields),
    ...connectionFields,
  };
}

/**
 * Build a canonical circuit snapshot and hash it using an injected SHA-256 adapter.
 * @param {string} circuitId Persistent Atlas circuit identity.
 * @param {Record<string, any>} model Pinned model and checkpoint identity.
 * @param {Record<string, any>} structure Circuit members, boundaries, and completeness.
 * @param {(canonicalIdentity: string) => string|Promise<string>} hashCanonicalIdentity Injected SHA-256 hex digest function.
 * @returns {Promise<Record<string, any>>} Versioned structural snapshot record.
 */
export async function createCircuitStructuralSnapshotV2(
  circuitId,
  model,
  structure,
  hashCanonicalIdentity
) {
  const componentIds = [...structure.componentIds].sort();
  const connectionIds = [...structure.connectionIds].sort();
  const boundaryComponentIds = [...structure.boundaryComponentIds].sort();
  const canonicalIdentity = canonicalCircuitSnapshotIdentity(model, {
    ...structure,
    componentIds,
    connectionIds,
    boundaryComponentIds,
  });
  const contentHash = await hashCanonicalIdentity(canonicalIdentity);
  return {
    schemaVersion: 2,
    id: circuitSnapshotId(contentHash),
    contentHash,
    circuitId,
    model,
    completeness: structure.completeness,
    componentIds,
    connectionIds,
    boundaryComponentIds,
  };
}

/**
 * Migrate one V1 recurrent-state mechanism without rewriting graph references.
 * @param {Record<string, any>} record Legacy V1 mechanism.
 * @param {{mechanismSchemaV1?: any, recurrentNeuronComponentSchemaV2?: any, recurrentActivationPositionSchemaV2?: any}} [schemas] Injected validators.
 * @returns {{valid: true, component: Record<string, any>, position: Record<string, any>, observations: Array<never>}|{valid: false, errors: Array<{code: string}>}} Migration result.
 */
export function migrateRecurrentStateMechanismV1ToV2(record, schemas) {
  const legacyResult = schemas?.mechanismSchemaV1?.safeParse(record);
  if (!legacyResult?.success) {
    return { valid: false, errors: [{ code: 'invalid-v1-mechanism' }] };
  }
  if (legacyResult.data.kind !== 'recurrent-state') {
    return {
      valid: false,
      errors: [{ code: 'unsupported-v1-mechanism-kind' }],
    };
  }

  const legacy = legacyResult.data;
  const component = createRecurrentNeuronComponentV2(
    legacy.model,
    legacy.sourceId,
    {
      layerIndex: legacy.layerIndex,
      activationHook: legacy.activationHook,
      neuronIndex: legacy.neuronIndex,
    }
  );
  const position = createRecurrentActivationPositionV2({
    componentId: component.id,
    timeStepIndex: legacy.timeStep,
  });
  const componentResult =
    schemas?.recurrentNeuronComponentSchemaV2?.safeParse(component);
  const positionResult =
    schemas?.recurrentActivationPositionSchemaV2?.safeParse(position);
  if (!componentResult?.success || !positionResult?.success) {
    return { valid: false, errors: [{ code: 'invalid-v2-migration' }] };
  }
  return {
    valid: true,
    component: componentResult.data,
    position: positionResult.data,
    observations: [],
  };
}

/**
 * Migrate one V1 native-neuron mechanism into its canonical V2 component.
 * @param {Record<string, any>} record V1 native-neuron mechanism.
 * @param {{mechanismSchemaV1?: any, nativeNeuronComponentSchemaV2?: any}} [schemas] Injected validators.
 * @returns {{valid: true, component: Record<string, any>}|{valid: false, errors: Array<{code: string}>}} Migration result.
 */
export function migrateNativeNeuronMechanismV1ToV2(record, schemas) {
  const legacyResult = schemas?.mechanismSchemaV1?.safeParse(record);
  if (!legacyResult?.success) {
    return { valid: false, errors: [{ code: 'invalid-v1-mechanism' }] };
  }
  if (legacyResult.data.kind !== 'native-neuron') {
    return {
      valid: false,
      errors: [{ code: 'unsupported-v1-mechanism-kind' }],
    };
  }

  const legacy = legacyResult.data;
  const component = createNativeNeuronComponentV2(
    legacy.model,
    legacy.sourceId,
    {
      layerIndex: legacy.layerIndex,
      activationHook: legacy.activationHook,
      neuronIndex: legacy.neuronIndex,
    }
  );
  const componentResult =
    schemas?.nativeNeuronComponentSchemaV2?.safeParse(component);
  if (!componentResult?.success) {
    return { valid: false, errors: [{ code: 'invalid-v2-migration' }] };
  }
  return { valid: true, component: componentResult.data };
}

/** @typedef {Record<string, any>} InterpretabilityRecord */
/** @typedef {Record<string, any>} AccuracyEvaluationRecordV1 */
/** @typedef {{variantId: string, heldOutSplitId: string, noiseScale: number, referenceAccuracy: number, mechanisticEstimate: number, samplingEstimate: number, mechanisticCompute: number, samplingCompute: number}} AccuracyEvaluationVariantV1 */
/** @typedef {{mechanisms?: Array<InterpretabilityRecord>, hypotheses?: Array<InterpretabilityRecord>, experiments?: Array<InterpretabilityRecord>, evidence?: Array<InterpretabilityRecord>, estimates?: Array<InterpretabilityRecord>, edges?: Array<InterpretabilityRecord>}} InterpretabilityGraphV1 */
/** @typedef {{mechanismSchemaV1: any, hypothesisSchemaV1: any, experimentSchemaV1: any, causalInterventionResultSchemaV1: any, evidenceSchemaV1: any, mechanisticEstimateSchemaV1: any, evidenceEdgeSchemaV1: any, accuracyEvaluationSchemaV1: any}} InterpretabilitySchemasV1 */

/** @type {Record<string, Array<string>>} */
const referenceFieldsByType = {
  hypotheses: ['mechanismIds', 'evidenceIds'],
  experiments: ['mechanismIds', 'hypothesisIds'],
  evidence: ['mechanismIds', 'hypothesisIds', 'experimentIds'],
  estimates: ['hypothesisIds', 'evidenceIds'],
};

/**
 * Add missing graph-reference errors for typed records.
 * @param {InterpretabilityGraphV1} graph Versioned graph collections.
 * @param {Set<string>} nodeIds Known addressable node identifiers.
 * @param {Array<Record<string, string>>} errors Mutable validation errors.
 */
function collectReferenceErrors(graph, nodeIds, errors) {
  for (const [type, fields] of Object.entries(referenceFieldsByType)) {
    const collection = /** @type {Array<InterpretabilityRecord>} */ (
      /** @type {Record<string, Array<InterpretabilityRecord> | undefined>} */ (
        graph
      )[type] ?? []
    );
    for (const record of collection) {
      const unresolved = fields.flatMap(field =>
        /** @type {Array<string>} */ (record[field] ?? [])
          .filter(referenceId => !nodeIds.has(referenceId))
          .map(referenceId => ({
            code: 'unresolved-reference',
            id: record.id,
            field,
            referenceId,
          }))
      );
      errors.push(...unresolved);
    }
  }
}

/**
 * Build a stable physical identity key for a validated mechanism record.
 * @param {InterpretabilityRecord} record Mechanism data.
 * @returns {string} Canonical mechanism coordinate key.
 */
function mechanismIdentityKey(record) {
  return JSON.stringify([
    record.model.repository,
    record.model.revision,
    record.layerIndex,
    record.activationHook,
    record.kind,
    record.sourceId ?? null,
    record.neuronIndex ?? null,
    record.featureIndex ?? null,
    record.headIndex ?? null,
    record.timeStep ?? null,
  ]);
}

/**
 * Check global record identity and reference integrity before graph persistence.
 * Records must already pass their versioned schemas.
 * @param {InterpretabilityGraphV1} graph Versioned graph collections.
 * @returns {{valid: boolean, errors: Array<Record<string, string>>}} Deterministic validation result.
 */
export function validateEvidenceGraphV1(graph) {
  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) {
    return { valid: false, errors: [{ code: 'invalid-graph' }] };
  }
  /** @type {Array<[string, Array<InterpretabilityRecord>, boolean]>} */
  const collections = [
    ['mechanisms', graph.mechanisms ?? [], true],
    ['hypotheses', graph.hypotheses ?? [], true],
    ['experiments', graph.experiments ?? [], true],
    ['evidence', graph.evidence ?? [], true],
    ['estimates', graph.estimates ?? [], true],
    ['edges', graph.edges ?? [], false],
  ];
  const entries = collections.flatMap(([type, records, isNode]) =>
    records.map(record => ({ type, record, isNode }))
  );
  entries.sort((left, right) =>
    `${left.record?.id ?? ''}:${left.type}`.localeCompare(
      `${right.record?.id ?? ''}:${right.type}`
    )
  );

  const errors = [];
  const allIds = new Map();
  const nodeIds = new Set();
  const mechanismIdsByIdentity = new Map();

  for (const entry of entries) {
    const { record, type, isNode } = entry;
    const id = record?.id;
    if (typeof id !== 'string' || id.trim() === '') {
      errors.push({ code: 'invalid-id', type });
      continue;
    }
    const existingType = allIds.get(id);
    if (existingType) {
      errors.push({
        code: 'duplicate-id',
        id,
        firstType: existingType,
        duplicateType: type,
      });
      continue;
    }
    allIds.set(id, type);
    if (isNode) nodeIds.add(id);
    if (
      type === 'mechanisms' &&
      record.model &&
      record.kind &&
      record.activationHook
    ) {
      const identityKey = mechanismIdentityKey(record);
      const existingId = mechanismIdsByIdentity.get(identityKey);
      if (existingId) {
        errors.push({
          code: 'duplicate-mechanism-identity',
          id,
          firstId: existingId,
        });
      } else {
        mechanismIdsByIdentity.set(identityKey, id);
      }
    }
  }

  collectReferenceErrors(graph, nodeIds, errors);

  for (const edge of graph.edges ?? []) {
    for (const field of ['fromId', 'toId']) {
      if (!nodeIds.has(edge[field])) {
        errors.push({
          code: 'unresolved-edge-endpoint',
          id: edge.id,
          field,
          referenceId: edge[field],
        });
      }
    }
  }

  errors.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right))
  );
  return { valid: errors.length === 0, errors };
}

/**
 * Sort a graph collection by its stable record ID for portable export.
 * @param {Array<InterpretabilityRecord>} records Graph records.
 * @returns {Array<InterpretabilityRecord>} Sorted copy of the records.
 */
function sortGraphRecords(records) {
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
}

const IDENTITY_GRAPH_COLLECTIONS_V2 = [
  'components',
  'activationPositions',
  'observations',
  'structuralConnections',
  'circuitSnapshots',
];

/**
 * Validate V2 identity graph data with its injected Zod-compatible schema.
 * @param {Record<string, any>} graph Identity collections without envelope version.
 * @param {any} identityGraphSchemaV2 Injected graph schema.
 * @returns {{valid: true, graph: Record<string, any>}|{valid: false, errors: Array<{code: string}>}} Validation result.
 */
export function validateInterpretabilityIdentityGraphV2(
  graph,
  identityGraphSchemaV2
) {
  if (typeof identityGraphSchemaV2?.safeParse !== 'function') {
    return { valid: false, errors: [{ code: 'missing-schema-validator' }] };
  }
  const parsed = identityGraphSchemaV2.safeParse({
    schemaVersion: 2,
    ...graph,
  });
  if (!parsed.success) {
    return { valid: false, errors: [{ code: 'invalid-identity-graph' }] };
  }
  return { valid: true, graph: sortIdentityCollectionsV2(parsed.data) };
}

/**
 * Export a canonical, validated V2 identity graph envelope.
 * @param {Record<string, any>} graph Identity collections.
 * @param {any} identityGraphSchemaV2 Injected graph schema.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<{code: string}>}} Export result.
 */
export function exportInterpretabilityIdentityGraphV2(
  graph,
  identityGraphSchemaV2
) {
  const result = validateInterpretabilityIdentityGraphV2(
    graph,
    identityGraphSchemaV2
  );
  if (!result.valid) return result;
  return {
    valid: true,
    json: JSON.stringify({ schemaVersion: 2, ...result.graph }),
  };
}

/**
 * Import a portable V2 identity graph envelope.
 * @param {string} json Portable graph JSON document.
 * @param {any} identityGraphSchemaV2 Injected graph schema.
 * @returns {{valid: true, graph: Record<string, any>}|{valid: false, errors: Array<Record<string, string|number>>}} Import result.
 */
export function importInterpretabilityIdentityGraphV2(
  json,
  identityGraphSchemaV2
) {
  if (typeof json !== 'string') {
    return { valid: false, errors: [{ code: 'invalid-json' }] };
  }
  let envelope;
  try {
    envelope = JSON.parse(json);
  } catch {
    return { valid: false, errors: [{ code: 'invalid-json' }] };
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, errors: [{ code: 'invalid-document' }] };
  }
  if (envelope.schemaVersion !== 2) {
    return { valid: false, errors: [{ code: 'unsupported-version' }] };
  }
  return validateInterpretabilityIdentityGraphV2(
    envelope,
    identityGraphSchemaV2
  );
}

const IDENTITY_REFERENCE_ENTITY_TYPES_V1 = Object.freeze([
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
]);

/**
 * Build an injected validator for attributable references to entities that may
 * not have been indexed yet.
 * @param {Record<string, any>} z Injected Zod-compatible API.
 * @returns {any} Strict versioned reference schema.
 */
export function createIdentityReferenceSchemaV1(z) {
  return z
    .object({
      schemaVersion: z.literal(1),
      claimId: z.string().min(1),
      entityType: z.enum(IDENTITY_REFERENCE_ENTITY_TYPES_V1),
      entityId: z.string().min(1),
      authorId: z.string().min(1),
      source: z.string().min(1),
      sourceRecordId: z.string().min(1).optional(),
      recordedAt: z.string().min(1),
      identityDescriptor: z.string().min(1).optional(),
    })
    .strict()
    .refine(identityReferenceIdentityIsCanonical);
}

/**
 * Validate canonical component IDs when a structured identity is available.
 * @param {Record<string, any>} claim Identity reference claim.
 * @returns {boolean} Whether any V2 component identity is well formed.
 */
function identityReferenceIdentityIsCanonical(claim) {
  const prefix = 'atlas:v2:component:';
  if (claim.entityType !== 'component' || !claim.entityId.startsWith(prefix)) {
    return true;
  }
  try {
    const identity = JSON.parse(
      decodeURIComponent(claim.entityId.slice(prefix.length))
    );
    return (
      Array.isArray(identity) &&
      claim.entityId === canonicalIdentityId('component', identity) &&
      (claim.identityDescriptor === undefined ||
        claim.identityDescriptor === JSON.stringify(identity))
    );
  } catch {
    return false;
  }
}

/**
 * Validate and summarize attributable entity-reference claims without
 * rewriting their IDs or provenance.
 * @param {Array<Record<string, any>>} claims Reference claims.
 * @param {any} identityReferenceSchemaV1 Injected reference validator.
 * @returns {{valid: true, entities: Array<Record<string, any>>, claims: Array<Record<string, any>>}|{valid: false, errors: Array<{code: string}>}} Summary or validation failure.
 */
export function summarizeIdentityReferencesV1(
  claims,
  identityReferenceSchemaV1
) {
  if (!Array.isArray(claims)) {
    return { valid: false, errors: [{ code: 'invalid-identity-references' }] };
  }
  if (typeof identityReferenceSchemaV1?.safeParse !== 'function') {
    return { valid: false, errors: [{ code: 'missing-schema-validator' }] };
  }
  /** @type {Array<Record<string, any>>} */
  const parsedClaims = [];
  const claimIds = new Set();
  for (const claim of claims) {
    const parsed = identityReferenceSchemaV1.safeParse(claim);
    if (!parsed.success || claimIds.has(parsed.data?.claimId)) {
      return {
        valid: false,
        errors: [{ code: 'invalid-identity-references' }],
      };
    }
    const parsedClaim = /** @type {Record<string, any>} */ (parsed.data);
    claimIds.add(parsedClaim.claimId);
    parsedClaims.push(parsedClaim);
  }
  /** @type {Map<string, Array<Record<string, any>>>} */
  const groups = new Map();
  for (const claim of parsedClaims) {
    const key = JSON.stringify([claim.entityType, claim.entityId]);
    const group = groups.get(key) ?? [];
    group.push(claim);
    groups.set(key, group);
  }
  const entities = [...groups.values()]
    .map(entityClaims => {
      const canonicalIdentities = [
        ...new Set(
          entityClaims
            .map(claim => claim.identityDescriptor)
            .filter(identity => identity !== undefined)
        ),
      ].sort();
      return {
        entityType: entityClaims[0].entityType,
        entityId: entityClaims[0].entityId,
        state:
          canonicalIdentities.length === 0
            ? 'unresolved'
            : canonicalIdentities.length === 1
              ? 'resolved'
              : 'conflict',
        ...(canonicalIdentities.length === 1
          ? { identityDescriptor: canonicalIdentities[0] }
          : {}),
        ...(canonicalIdentities.length > 1
          ? { conflictingIdentities: canonicalIdentities }
          : {}),
        claims: entityClaims.sort((left, right) =>
          left.claimId.localeCompare(right.claimId)
        ),
      };
    })
    .sort((left, right) =>
      JSON.stringify([left.entityType, left.entityId]).localeCompare(
        JSON.stringify([right.entityType, right.entityId])
      )
    );
  return {
    valid: true,
    entities,
    claims: parsedClaims.sort((left, right) =>
      left.claimId.localeCompare(right.claimId)
    ),
  };
}

/**
 * Export reference claims in a deterministic, versioned portable envelope.
 * @param {Array<Record<string, any>>} claims Reference claims.
 * @param {any} identityReferenceSchemaV1 Injected reference validator.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<{code: string}>}} Export result.
 */
export function exportIdentityReferencesV1(claims, identityReferenceSchemaV1) {
  const result = summarizeIdentityReferencesV1(
    claims,
    identityReferenceSchemaV1
  );
  if (!result.valid) return result;
  return {
    valid: true,
    json: JSON.stringify({ schemaVersion: 1, claims: result.claims }),
  };
}

/**
 * Import a portable reference envelope and deterministically summarize its
 * unresolved, resolved, and conflicting entity claims.
 * @param {string} json Portable JSON envelope.
 * @param {any} identityReferenceSchemaV1 Injected reference validator.
 * @returns {ReturnType<typeof summarizeIdentityReferencesV1>} Import result.
 */
export function importIdentityReferencesV1(json, identityReferenceSchemaV1) {
  if (typeof json !== 'string') {
    return { valid: false, errors: [{ code: 'invalid-json' }] };
  }
  let envelope;
  try {
    envelope = JSON.parse(json);
  } catch {
    return { valid: false, errors: [{ code: 'invalid-json' }] };
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, errors: [{ code: 'invalid-document' }] };
  }
  if (
    envelope.schemaVersion !== 1 ||
    Object.keys(envelope).some(
      key => !['schemaVersion', 'claims'].includes(key)
    )
  ) {
    return { valid: false, errors: [{ code: 'unsupported-version' }] };
  }
  return summarizeIdentityReferencesV1(
    envelope.claims,
    identityReferenceSchemaV1
  );
}

/**
 * Sort all validated V2 graph collections without changing their records.
 * @param {Record<string, any>} graph Parsed graph envelope.
 * @returns {Record<string, Array<Record<string, any>>>} Canonical collections.
 */
function sortIdentityCollectionsV2(graph) {
  return Object.fromEntries(
    IDENTITY_GRAPH_COLLECTIONS_V2.map(collection => [
      collection,
      sortGraphRecords(graph[collection]),
    ])
  );
}

/**
 * Export V1 evidence and V2 identities in a V2 bundle without cross-version links.
 * @param {{evidenceGraph: InterpretabilityGraphV1, identityGraph: Record<string, any>}} bundle Portable research subgraphs.
 * @param {{evidenceGraphSchemasV1: InterpretabilitySchemasV1, identityGraphSchemaV2?: any, identityGraphSchemasV2?: {identityGraphSchemaV2: any}}} schemas Injected subgraph schemas.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<Record<string, any>>}} Bundle export result.
 */
export function exportInterpretabilityResearchBundleV2(bundle, schemas) {
  return exportInterpretabilityResearchBundle(bundle, schemas, 2);
}

/**
 * Export V1 evidence and V2 identities with explicit mechanism lineage.
 * @param {{evidenceGraph: InterpretabilityGraphV1, identityGraph: Record<string, any>}} bundle Portable research subgraphs.
 * @param {{evidenceGraphSchemasV1: InterpretabilitySchemasV1, identityGraphSchemasV2: {identityGraphSchemaV2: any, recurrentNeuronComponentSchemaV2: any, nativeNeuronComponentSchemaV2?: any, recurrentActivationPositionSchemaV2: any}}} schemas Injected subgraph schemas.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<Record<string, any>>}} Bundle export result.
 */
export function exportInterpretabilityResearchBundleV3(bundle, schemas) {
  return exportInterpretabilityResearchBundle(bundle, schemas, 3);
}

/**
 * Export a portable V4 bundle with linked held-out accuracy evaluations.
 * @param {{evidenceGraph: InterpretabilityGraphV1, identityGraph: Record<string, any>, accuracyEvaluations: Array<AccuracyEvaluationRecordV1>}} bundle Portable research subgraphs and evaluations.
 * @param {Record<string, any>} schemas Injected subgraph and report schemas.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<Record<string, any>>}} Bundle export result.
 */
export function exportInterpretabilityResearchBundleV4(bundle, schemas) {
  return exportInterpretabilityResearchBundle(bundle, schemas, 4);
}

/**
 * Export a portable V5 bundle with additive identity-reference claims.
 * @param {{evidenceGraph: InterpretabilityGraphV1, identityGraph: Record<string, any>, accuracyEvaluations: Array<AccuracyEvaluationRecordV1>, identityReferences: Array<Record<string, any>>}} bundle Portable research subgraphs and references.
 * @param {Record<string, any>} schemas Injected subgraph and reference schemas.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<Record<string, any>>}} Bundle export result.
 */
export function exportInterpretabilityResearchBundleV5(bundle, schemas) {
  return exportInterpretabilityResearchBundle(bundle, schemas, 5);
}

/**
 * Validate portable subgraphs and serialize the selected outer envelope version.
 * @param {Record<string, any>} bundle Portable research subgraphs.
 * @param {Record<string, any>} schemas Injected subgraph schemas.
 * @param {2|3|4|5} version Outer bundle version.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<Record<string, any>>}} Bundle export result.
 */
function exportInterpretabilityResearchBundle(bundle, schemas, version) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    return researchBundleFailure('invalid-research-bundle');
  }
  if (
    !bundle.evidenceGraph ||
    typeof bundle.evidenceGraph !== 'object' ||
    Array.isArray(bundle.evidenceGraph)
  ) {
    return researchBundleFailure('invalid-evidence-graph');
  }
  const evidenceExport = exportEvidenceGraphV1(bundle.evidenceGraph);
  if (!evidenceExport.valid) {
    return researchBundleFailure(
      'invalid-evidence-graph',
      evidenceExport.errors
    );
  }
  const evidenceResult = importEvidenceGraphV1(
    evidenceExport.json,
    schemas?.evidenceGraphSchemasV1
  );
  if (!evidenceResult.valid) {
    return researchBundleFailure(
      'invalid-evidence-graph',
      evidenceResult.errors
    );
  }
  const identityResult = validateInterpretabilityIdentityGraphV2(
    bundle.identityGraph,
    researchBundleIdentityGraphSchemaV2(schemas)
  );
  if (!identityResult.valid) {
    return researchBundleFailure(
      'invalid-identity-graph',
      identityResult.errors
    );
  }
  const observationReferences = validateObservationExperimentReferences(
    evidenceResult.graph,
    identityResult.graph
  );
  if (!observationReferences.valid) {
    return researchBundleFailure(
      'invalid-observation-experiment-references',
      observationReferences.errors
    );
  }
  if (
    version < 4 &&
    Array.isArray(bundle.accuracyEvaluations) &&
    bundle.accuracyEvaluations.length > 0
  ) {
    return researchBundleFailure('unsupported-accuracy-evaluations');
  }
  if (version === 2) {
    return {
      valid: true,
      json: JSON.stringify({
        schemaVersion: 2,
        evidenceGraph: { schemaVersion: 1, ...evidenceResult.graph },
        identityGraph: { schemaVersion: 2, ...identityResult.graph },
      }),
    };
  }
  const lineageResult = deriveMechanismIdentityLinksV3(
    evidenceResult.graph,
    identityResult.graph,
    schemas
  );
  if (!lineageResult.valid) {
    return researchBundleFailure(
      'invalid-mechanism-identity-links',
      lineageResult.errors
    );
  }
  /** @type {ReturnType<typeof validateAccuracyEvaluationCollection>} */
  const accuracyResult =
    version >= 4
      ? validateAccuracyEvaluationCollection(
          evidenceResult.graph,
          bundle.accuracyEvaluations,
          schemas
        )
      : { valid: true, records: [] };
  if (!accuracyResult.valid) {
    return researchBundleFailure(
      'invalid-accuracy-evaluations',
      accuracyResult.errors
    );
  }
  /** @type {ReturnType<typeof summarizeIdentityReferencesV1>} */
  const identityReferencesResult =
    version === 5
      ? summarizeIdentityReferencesV1(
          bundle.identityReferences,
          identityReferenceSchema(schemas)
        )
      : { valid: true, entities: [], claims: [] };
  if (!identityReferencesResult.valid) {
    return researchBundleFailure(
      'invalid-identity-references',
      identityReferencesResult.errors
    );
  }
  return {
    valid: true,
    json: JSON.stringify({
      schemaVersion: version,
      evidenceGraph: { schemaVersion: 1, ...evidenceResult.graph },
      identityGraph: { schemaVersion: 2, ...identityResult.graph },
      mechanismIdentityLinks: lineageResult.links,
      ...(version >= 4 ? { accuracyEvaluations: accuracyResult.records } : {}),
      ...(version === 5
        ? { identityReferences: identityReferencesResult.claims }
        : {}),
    }),
  };
}

/**
 * Import and validate both subgraphs in a portable research bundle.
 * @param {string} json Portable research bundle JSON.
 * @param {{evidenceGraphSchemasV1: InterpretabilitySchemasV1, identityGraphSchemasV2: {identityGraphSchemaV2: any, recurrentNeuronComponentSchemaV2: any, nativeNeuronComponentSchemaV2?: any, recurrentActivationPositionSchemaV2: any, identityReferenceSchemaV1?: any}, identityReferenceSchemaV1?: any}} schemas Injected subgraph schemas.
 * @returns {{valid: true, bundle: {evidenceGraph: InterpretabilityGraphV1, identityGraph: Record<string, any>, mechanismIdentityLinks: Array<Record<string, string>>, accuracyEvaluations: Array<AccuracyEvaluationRecordV1>, identityReferences: Array<Record<string, any>>}}|{valid: false, errors: Array<Record<string, any>>}} Bundle import result.
 */
export function importInterpretabilityResearchBundleV2(json, schemas) {
  if (typeof json !== 'string') return researchBundleFailure('invalid-json');
  let envelope;
  try {
    envelope = JSON.parse(json);
  } catch {
    return researchBundleFailure('invalid-json');
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return researchBundleFailure('invalid-document');
  }
  if (![2, 3, 4, 5].includes(envelope.schemaVersion)) {
    return researchBundleFailure('unsupported-version');
  }
  const allowedKeys =
    envelope.schemaVersion === 2
      ? ['schemaVersion', 'evidenceGraph', 'identityGraph']
      : envelope.schemaVersion === 3
        ? [
            'schemaVersion',
            'evidenceGraph',
            'identityGraph',
            'mechanismIdentityLinks',
          ]
        : envelope.schemaVersion === 4
          ? [
              'schemaVersion',
              'evidenceGraph',
              'identityGraph',
              'mechanismIdentityLinks',
              'accuracyEvaluations',
            ]
          : [
              'schemaVersion',
              'evidenceGraph',
              'identityGraph',
              'mechanismIdentityLinks',
              'accuracyEvaluations',
              'identityReferences',
            ];
  if (Object.keys(envelope).some(key => !allowedKeys.includes(key))) {
    return researchBundleFailure('invalid-research-bundle');
  }

  const evidenceResult = importEvidenceGraphV1(
    JSON.stringify(envelope.evidenceGraph),
    schemas?.evidenceGraphSchemasV1
  );
  if (!evidenceResult.valid) {
    return researchBundleFailure(
      'invalid-evidence-graph',
      evidenceResult.errors
    );
  }
  if (envelope.identityGraph?.schemaVersion !== 2) {
    return researchBundleFailure('invalid-identity-graph');
  }
  const identityResult = validateInterpretabilityIdentityGraphV2(
    envelope.identityGraph,
    researchBundleIdentityGraphSchemaV2(schemas)
  );
  if (!identityResult.valid) {
    return researchBundleFailure(
      'invalid-identity-graph',
      identityResult.errors
    );
  }
  const observationReferences = validateObservationExperimentReferences(
    evidenceResult.graph,
    identityResult.graph
  );
  if (!observationReferences.valid) {
    return researchBundleFailure(
      'invalid-observation-experiment-references',
      observationReferences.errors
    );
  }
  /** @type {Array<Record<string, string>>} */
  let mechanismIdentityLinks = [];
  if (envelope.schemaVersion >= 3) {
    const lineageResult = deriveMechanismIdentityLinksV3(
      evidenceResult.graph,
      identityResult.graph,
      schemas
    );
    if (!lineageResult.valid) {
      return researchBundleFailure(
        'invalid-mechanism-identity-links',
        lineageResult.errors
      );
    }
    if (
      !mechanismIdentityLinksMatchV3(
        envelope.mechanismIdentityLinks,
        lineageResult.links
      )
    ) {
      return researchBundleFailure('invalid-mechanism-identity-links');
    }
    mechanismIdentityLinks = lineageResult.links;
  }
  /** @type {ReturnType<typeof validateAccuracyEvaluationCollection>} */
  const accuracyResult =
    envelope.schemaVersion >= 4
      ? validateAccuracyEvaluationCollection(
          evidenceResult.graph,
          envelope.accuracyEvaluations,
          schemas
        )
      : { valid: true, records: [] };
  if (!accuracyResult.valid) {
    return researchBundleFailure(
      'invalid-accuracy-evaluations',
      accuracyResult.errors
    );
  }
  /** @type {ReturnType<typeof summarizeIdentityReferencesV1>} */
  const identityReferencesResult =
    envelope.schemaVersion === 5
      ? summarizeIdentityReferencesV1(
          envelope.identityReferences,
          identityReferenceSchema(schemas)
        )
      : { valid: true, entities: [], claims: [] };
  if (!identityReferencesResult.valid) {
    return researchBundleFailure(
      'invalid-identity-references',
      identityReferencesResult.errors
    );
  }
  return {
    valid: true,
    bundle: {
      evidenceGraph: evidenceResult.graph,
      identityGraph: identityResult.graph,
      mechanismIdentityLinks,
      accuracyEvaluations: accuracyResult.records,
      identityReferences: identityReferencesResult.claims,
    },
  };
}

/**
 * Resolve the injected V1 reference schema from the supported schema adapters.
 * @param {Record<string, any>} schemas Injected research schemas.
 * @returns {any} Reference validator.
 */
function identityReferenceSchema(schemas) {
  return (
    schemas?.identityGraphSchemasV2?.identityReferenceSchemaV1 ??
    schemas?.identityReferenceSchemaV1
  );
}

/**
 * Resolve the injected V2 graph schema from either the legacy or full schema set.
 * @param {Record<string, any>} schemas Bundle schema adapters.
 * @returns {any} Injected V2 graph schema.
 */
function researchBundleIdentityGraphSchemaV2(schemas) {
  return (
    schemas?.identityGraphSchemasV2?.identityGraphSchemaV2 ??
    schemas?.identityGraphSchemaV2
  );
}

/**
 * Derive and validate V3 links from V1 mechanisms to canonical V2 components.
 * Recurrent-state mechanisms also resolve one explicit activation position.
 * @param {InterpretabilityGraphV1} evidenceGraph Validated V1 graph.
 * @param {Record<string, any>} identityGraph Validated V2 graph.
 * @param {Record<string, any>} schemas Injected migration schemas.
 * @returns {{valid: true, links: Array<Record<string, string>>}|{valid: false, errors: Array<Record<string, any>>}} Canonical lineage links.
 */
function deriveMechanismIdentityLinksV3(evidenceGraph, identityGraph, schemas) {
  const mechanisms = /** @type {Array<InterpretabilityRecord>} */ (
    evidenceGraph.mechanisms
  );
  const recurrentMechanisms = mechanisms.filter(
    mechanism => mechanism.kind === 'recurrent-state'
  );
  const nativeMechanisms = mechanisms.filter(
    mechanism => mechanism.kind === 'native-neuron'
  );
  if (recurrentMechanisms.length + nativeMechanisms.length === 0) {
    return { valid: true, links: [] };
  }

  const evidenceSchemas = schemas?.evidenceGraphSchemasV1;
  const identitySchemas = schemas?.identityGraphSchemasV2;
  const mechanismSchemaV1 = evidenceSchemas?.mechanismSchemaV1;

  const recurrentMigrationSchemas = {
    mechanismSchemaV1,
    recurrentNeuronComponentSchemaV2:
      identitySchemas?.recurrentNeuronComponentSchemaV2,
    recurrentActivationPositionSchemaV2:
      identitySchemas?.recurrentActivationPositionSchemaV2,
  };
  const nativeMigrationSchemas = {
    mechanismSchemaV1,
    nativeNeuronComponentSchemaV2:
      identitySchemas?.nativeNeuronComponentSchemaV2,
  };
  if (
    (recurrentMechanisms.length > 0 &&
      Object.values(recurrentMigrationSchemas).some(
        schema => typeof schema?.safeParse !== 'function'
      )) ||
    (nativeMechanisms.length > 0 &&
      typeof nativeMigrationSchemas.nativeNeuronComponentSchemaV2?.safeParse !==
        'function')
  ) {
    return { valid: false, errors: [{ code: 'missing-lineage-schemas' }] };
  }

  const recurrentResult = deriveRecurrentMechanismIdentityLinksV3(
    recurrentMechanisms,
    identityGraph,
    recurrentMigrationSchemas
  );
  if (!recurrentResult.valid) return recurrentResult;
  const nativeResult = deriveNativeMechanismIdentityLinksV3(
    nativeMechanisms,
    identityGraph,
    nativeMigrationSchemas
  );
  if (!nativeResult.valid) return nativeResult;

  const links = [...recurrentResult.links, ...nativeResult.links];
  links.sort((left, right) =>
    left.legacyMechanismId < right.legacyMechanismId ? -1 : 1
  );
  return { valid: true, links };
}

/**
 * Derive links for V1 recurrent mechanisms, retaining their exact step.
 * @param {Array<InterpretabilityRecord>} mechanisms V1 recurrent mechanisms.
 * @param {Record<string, any>} identityGraph Validated V2 graph.
 * @param {Record<string, any>} migrationSchemas Injected migration schemas.
 * @returns {{valid: true, links: Array<Record<string, string>>}|{valid: false, errors: Array<Record<string, any>>}} Recurrent links.
 */
function deriveRecurrentMechanismIdentityLinksV3(
  mechanisms,
  identityGraph,
  migrationSchemas
) {
  const components = /** @type {Array<Record<string, any>>} */ (
    identityGraph.components
  );
  const activationPositions = /** @type {Array<Record<string, any>>} */ (
    identityGraph.activationPositions
  );
  const links = [];
  for (const mechanism of mechanisms) {
    const migrated = migrateRecurrentStateMechanismV1ToV2(
      mechanism,
      migrationSchemas
    );
    if (!migrated.valid) {
      return {
        valid: false,
        errors: [
          {
            code: 'invalid-legacy-recurrent-state',
            mechanismId: mechanism.id,
            details: migrated.errors,
          },
        ],
      };
    }
    if (!components.some(component => component.id === migrated.component.id)) {
      return {
        valid: false,
        errors: [
          { code: 'missing-lineage-component', mechanismId: mechanism.id },
        ],
      };
    }
    if (
      !activationPositions.some(
        position =>
          position.id === migrated.position.id &&
          position.componentId === migrated.component.id
      )
    ) {
      return {
        valid: false,
        errors: [
          { code: 'missing-lineage-position', mechanismId: mechanism.id },
        ],
      };
    }
    links.push({
      legacyMechanismId: mechanism.id,
      componentId: migrated.component.id,
      activationPositionId: migrated.position.id,
    });
  }
  return { valid: true, links };
}

/**
 * Derive component-only links for V1 native-neuron mechanisms.
 * @param {Array<InterpretabilityRecord>} mechanisms V1 native mechanisms.
 * @param {Record<string, any>} identityGraph Validated V2 graph.
 * @param {Record<string, any>} migrationSchemas Injected migration schemas.
 * @returns {{valid: true, links: Array<Record<string, string>>}|{valid: false, errors: Array<Record<string, any>>}} Native links.
 */
function deriveNativeMechanismIdentityLinksV3(
  mechanisms,
  identityGraph,
  migrationSchemas
) {
  const components = /** @type {Array<Record<string, any>>} */ (
    identityGraph.components
  );
  const links = [];
  for (const mechanism of mechanisms) {
    const migrated = migrateNativeNeuronMechanismV1ToV2(
      mechanism,
      migrationSchemas
    );
    if (!migrated.valid) {
      return {
        valid: false,
        errors: [
          {
            code: 'invalid-legacy-native-neuron',
            mechanismId: mechanism.id,
            details: migrated.errors,
          },
        ],
      };
    }
    if (!components.some(component => component.id === migrated.component.id)) {
      return {
        valid: false,
        errors: [
          { code: 'missing-lineage-component', mechanismId: mechanism.id },
        ],
      };
    }
    links.push({
      legacyMechanismId: mechanism.id,
      componentId: migrated.component.id,
    });
  }
  return { valid: true, links };
}

/**
 * Confirm supplied V3 links exactly cover the canonical migration result.
 * @param {unknown} actual Links from the imported envelope.
 * @param {Array<Record<string, string>>} expected Derived canonical links.
 * @returns {boolean} Whether the links match by legacy mechanism ID.
 */
function mechanismIdentityLinksMatchV3(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const byLegacyMechanismId = new Map();
  for (const link of actual) {
    if (!link || typeof link !== 'object' || Array.isArray(link)) return false;
    const keys = Object.keys(link).sort();
    const hasComponentLink =
      keys.length === 2 &&
      keys[0] === 'componentId' &&
      keys[1] === 'legacyMechanismId';
    const hasPositionLink =
      keys.length === 3 &&
      keys[0] === 'activationPositionId' &&
      keys[1] === 'componentId' &&
      keys[2] === 'legacyMechanismId';
    if (
      (!hasComponentLink && !hasPositionLink) ||
      typeof link.legacyMechanismId !== 'string' ||
      typeof link.componentId !== 'string' ||
      (hasPositionLink && typeof link.activationPositionId !== 'string') ||
      byLegacyMechanismId.has(link.legacyMechanismId)
    ) {
      return false;
    }
    byLegacyMechanismId.set(link.legacyMechanismId, link);
  }
  return expected.every(expectedLink => {
    const actualLink = byLegacyMechanismId.get(expectedLink.legacyMechanismId);
    return (
      actualLink?.componentId === expectedLink.componentId &&
      actualLink?.activationPositionId === expectedLink.activationPositionId
    );
  });
}

const ACCURACY_REPORT_NOISE_SCALES_V1 = Object.freeze([0.01, 0.05, 0.1, 0.2]);
const ACCURACY_REPORT_FLOAT_TOLERANCE_V1 = 1e-12;

/**
 * Validate canonical report records and their links to submitted estimates.
 * @param {InterpretabilityGraphV1} evidenceGraph Validated evidence graph.
 * @param {Array<AccuracyEvaluationRecordV1>} evaluations Persisted reports.
 * @param {Record<string, any>} schemas Injected report schemas.
 * @returns {{valid: true, records: Array<AccuracyEvaluationRecordV1>}|{valid: false, errors: Array<Record<string, any>>}} Validation result.
 */
function validateAccuracyEvaluationCollection(
  evidenceGraph,
  evaluations,
  schemas
) {
  if (!Array.isArray(evaluations)) {
    return { valid: false, errors: [{ code: 'invalid-accuracy-evaluations' }] };
  }
  if (evaluations.length === 0) return { valid: true, records: [] };

  const schemaErrors = validateSubmissionRecords(
    'accuracyEvaluations',
    evaluations,
    schemas?.evidenceGraphSchemasV1?.accuracyEvaluationSchemaV1
  );
  if (schemaErrors.length > 0) return { valid: false, errors: schemaErrors };

  /** @type {Array<keyof InterpretabilityGraphV1>} */
  const graphCollections = [
    'mechanisms',
    'hypotheses',
    'experiments',
    'estimates',
    'evidence',
    'edges',
  ];
  const graphRecords = graphCollections.flatMap(
    collection => evidenceGraph[collection] ?? []
  );
  const graphIds = new Set(graphRecords.map(record => record.id));
  const estimatesById = new Map(
    (evidenceGraph.estimates ?? []).map(estimate => [estimate.id, estimate])
  );
  const evaluationIds = new Set();
  const errors = [];

  for (const evaluation of evaluations) {
    if (graphIds.has(evaluation.id) || evaluationIds.has(evaluation.id)) {
      errors.push({ code: 'duplicate-id', id: evaluation.id });
      continue;
    }
    evaluationIds.add(evaluation.id);
    validateAccuracyEvaluationLinks(evaluation, estimatesById, errors);
  }
  errors.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right))
  );
  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true, records: sortGraphRecords(evaluations) };
}

/**
 * Check that report coverage and variant estimate links are complete and consistent.
 * @param {AccuracyEvaluationRecordV1} evaluation Persisted report.
 * @param {Map<string, InterpretabilityRecord>} estimates Existing estimate records.
 * @param {Array<Record<string, any>>} errors Mutable validation errors.
 */
function validateAccuracyEvaluationLinks(evaluation, estimates, errors) {
  const { report, estimateLinks } = evaluation;
  /** @type {Array<AccuracyEvaluationVariantV1>} */
  const variants = report.variants;
  if (
    variants.length !== 32 ||
    report.byNoiseScale.length !== ACCURACY_REPORT_NOISE_SCALES_V1.length ||
    estimateLinks.length !== variants.length
  ) {
    errors.push({
      code: 'invalid-accuracy-evaluation-links',
      id: evaluation.id,
    });
    return;
  }

  const variantsById = new Map();
  const scaleCounts = new Map(
    ACCURACY_REPORT_NOISE_SCALES_V1.map(noiseScale => [noiseScale, 0])
  );
  for (const variant of variants) {
    if (variantsById.has(variant.variantId)) {
      errors.push({
        code: 'duplicate-accuracy-variant-id',
        id: evaluation.id,
        variantId: variant.variantId,
      });
    }
    variantsById.set(variant.variantId, variant);
    scaleCounts.set(
      variant.noiseScale,
      /** @type {number} */ (scaleCounts.get(variant.noiseScale)) + 1
    );
  }
  validateAccuracyEvaluationVariantProvenance(evaluation, variants, errors);
  if (
    ACCURACY_REPORT_NOISE_SCALES_V1.some(
      noiseScale => scaleCounts.get(noiseScale) !== 8
    )
  ) {
    errors.push({ code: 'invalid-accuracy-scale-coverage', id: evaluation.id });
  }

  const linkedVariants = new Set();
  const linkedEstimates = new Set();
  for (const link of estimateLinks) {
    const variant = variantsById.get(link.variantId);
    const estimate = estimates.get(link.estimateId);
    if (
      !variant ||
      linkedVariants.has(link.variantId) ||
      linkedEstimates.has(link.estimateId)
    ) {
      errors.push({
        code: 'invalid-accuracy-evaluation-links',
        id: evaluation.id,
        variantId: link.variantId,
      });
      continue;
    }
    linkedVariants.add(link.variantId);
    linkedEstimates.add(link.estimateId);
    if (!estimate) {
      errors.push({
        code: 'unresolved-estimate-reference',
        id: evaluation.id,
        estimateId: link.estimateId,
      });
      continue;
    }
    if (
      estimate.metric?.name !== 'accuracy' ||
      estimate.metric.value !== variant.mechanisticEstimate ||
      estimate.heldOutSplitId !== report.heldOutSplitId
    ) {
      errors.push({
        code: 'mismatched-estimate-reference',
        id: evaluation.id,
        estimateId: link.estimateId,
      });
    }
  }
  if (linkedVariants.size !== variantsById.size) {
    errors.push({
      code: 'invalid-accuracy-evaluation-links',
      id: evaluation.id,
    });
  }

  validateAccuracyEvaluationReportSummary(evaluation, variants, errors);
}

/**
 * Validate that held-out variants share the report split and compute budget.
 * @param {AccuracyEvaluationRecordV1} evaluation Persisted report.
 * @param {Array<AccuracyEvaluationVariantV1>} variants Held-out variant rows.
 * @param {Array<Record<string, any>>} errors Mutable validation errors.
 */
function validateAccuracyEvaluationVariantProvenance(
  evaluation,
  variants,
  errors
) {
  const inconsistentVariant = variants.find(
    variant =>
      variant.heldOutSplitId !== evaluation.report.heldOutSplitId ||
      variant.mechanisticCompute !== variant.samplingCompute
  );
  if (inconsistentVariant) {
    errors.push({
      code: 'invalid-accuracy-variant-provenance',
      id: evaluation.id,
      variantId: inconsistentVariant.variantId,
    });
  }
}

/**
 * Validate MSE, accuracy range, and material-variation summaries against rows.
 * @param {AccuracyEvaluationRecordV1} evaluation Persisted report.
 * @param {Array<AccuracyEvaluationVariantV1>} variants Held-out variant rows.
 * @param {Array<Record<string, any>>} errors Mutable validation errors.
 */
function validateAccuracyEvaluationReportSummary(evaluation, variants, errors) {
  const { report } = evaluation;
  const scaleSummaries = new Map(
    /** @type {Array<{noiseScale: number, mechanisticMse: number, samplingMse: number}>} */ (
      report.byNoiseScale
    ).map(summary => [summary.noiseScale, summary])
  );
  if (
    scaleSummaries.size !== ACCURACY_REPORT_NOISE_SCALES_V1.length ||
    ACCURACY_REPORT_NOISE_SCALES_V1.some(
      noiseScale => !scaleSummaries.has(noiseScale)
    )
  ) {
    errors.push({ code: 'invalid-accuracy-scale-summary', id: evaluation.id });
  }
  for (const noiseScale of ACCURACY_REPORT_NOISE_SCALES_V1) {
    const summary = scaleSummaries.get(noiseScale);
    if (!summary) continue;
    const scaleVariants = variants.filter(
      variant => variant.noiseScale === noiseScale
    );
    if (
      !accuracyReportMseMatches(
        summary.mechanisticMse,
        scaleVariants,
        'mechanisticEstimate'
      ) ||
      !accuracyReportMseMatches(
        summary.samplingMse,
        scaleVariants,
        'samplingEstimate'
      )
    ) {
      errors.push({
        code: 'inconsistent-accuracy-scale-summary',
        id: evaluation.id,
        noiseScale,
      });
    }
  }
  const accuracyValues = variants.map(variant => variant.referenceAccuracy);
  const minimumAccuracy = Math.min(...accuracyValues);
  const maximumAccuracy = Math.max(...accuracyValues);
  const referenceSpread = maximumAccuracy - minimumAccuracy;
  if (
    !accuracyReportValueMatches(
      report.referenceAccuracyRange.minimum,
      minimumAccuracy
    ) ||
    !accuracyReportValueMatches(
      report.referenceAccuracyRange.maximum,
      maximumAccuracy
    ) ||
    !accuracyReportValueMatches(
      report.referenceAccuracyRange.spread,
      referenceSpread
    )
  ) {
    errors.push({
      code: 'inconsistent-accuracy-reference-range',
      id: evaluation.id,
    });
  }
  if (
    !accuracyReportMseMatches(
      report.overall.mechanisticMse,
      variants,
      'mechanisticEstimate'
    ) ||
    !accuracyReportMseMatches(
      report.overall.samplingMse,
      variants,
      'samplingEstimate'
    )
  ) {
    errors.push({
      code: 'inconsistent-accuracy-overall-summary',
      id: evaluation.id,
    });
  }
  if (report.materialVariationMet !== referenceSpread >= 0.05) {
    errors.push({
      code: 'invalid-material-variation-result',
      id: evaluation.id,
    });
  }
}

/**
 * Compare a report MSE with the mean squared error derived from its variants.
 * The tolerance accounts for floating-point summation order after canonical sorting.
 * @param {number} actual Reported MSE.
 * @param {Array<AccuracyEvaluationVariantV1>} variants Held-out variant rows.
 * @param {'mechanisticEstimate'|'samplingEstimate'} estimateField Estimate compared with reference accuracy.
 * @returns {boolean} Whether the reported and derived MSE values agree.
 */
function accuracyReportMseMatches(actual, variants, estimateField) {
  const squaredErrorSum = variants.reduce((sum, variant) => {
    const difference = variant[estimateField] - variant.referenceAccuracy;
    return sum + difference * difference;
  }, 0);
  const expected = squaredErrorSum / variants.length;
  return accuracyReportValueMatches(actual, expected);
}

/**
 * Compare two serialized summary values using the protocol's numeric tolerance.
 * @param {number} actual Persisted report value.
 * @param {number} expected Value recomputed from variant rows.
 * @returns {boolean} Whether the values agree within tolerance.
 */
function accuracyReportValueMatches(actual, expected) {
  return (
    Math.abs(actual - expected) <=
    ACCURACY_REPORT_FLOAT_TOLERANCE_V1 * Math.max(1, Math.abs(expected))
  );
}

/**
 * Wrap a nested graph failure in its stable research-bundle category.
 * @param {string} code Bundle error category.
 * @param {Array<Record<string, any>>} [details] Nested graph errors.
 * @returns {{valid: false, errors: Array<Record<string, any>>}} Failure result.
 */
function researchBundleFailure(code, details) {
  return {
    valid: false,
    errors: [{ code, ...(details ? { details } : {}) }],
  };
}

/**
 * Require every portable activation observation to point to a V1 experiment.
 * @param {InterpretabilityGraphV1 & {experiments: Array<InterpretabilityRecord>}} evidenceGraph Validated evidence graph.
 * @param {Record<string, any>} identityGraph Validated V2 identity graph.
 * @returns {{valid: true}|{valid: false, errors: Array<Record<string, string>>}} Cross-graph reference result.
 */
function validateObservationExperimentReferences(evidenceGraph, identityGraph) {
  const experimentIds = new Set(
    evidenceGraph.experiments.map(experiment => experiment.id)
  );
  const errors = identityGraph.observations.flatMap(
    /**
     * @param {Record<string, any>} observation Activation observation.
     * @returns {Array<Record<string, string>>} Unresolved experiment reference errors.
     */
    observation =>
      experimentIds.has(observation.experimentId)
        ? []
        : [
            {
              code: 'unresolved-observation-experiment',
              observationId: observation.id,
              experimentId: observation.experimentId,
            },
          ]
  );
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Export a validated evidence graph as a versioned, deterministic JSON document.
 * Records must already pass their versioned schemas.
 * @param {InterpretabilityGraphV1} graph Versioned graph collections.
 * @returns {{valid: true, json: string} | {valid: false, errors: Array<Record<string, string>>}} Export result.
 */
export function exportEvidenceGraphV1(graph) {
  const validationFailure = validateGraphInput(graph);
  if (validationFailure) return validationFailure;

  const graphDocument = {
    schemaVersion: 1,
    mechanisms: sortGraphRecords(graph.mechanisms ?? []),
    hypotheses: sortGraphRecords(graph.hypotheses ?? []),
    experiments: sortGraphRecords(graph.experiments ?? []),
    estimates: sortGraphRecords(graph.estimates ?? []),
    evidence: sortGraphRecords(graph.evidence ?? []),
    edges: sortGraphRecords(graph.edges ?? []),
  };
  return { valid: true, json: JSON.stringify(graphDocument) };
}

/**
 * Import and validate a portable V1 graph using caller-provided schemas.
 * @param {string} json Portable graph JSON document.
 * @param {{mechanismSchemaV1: any, hypothesisSchemaV1: any, experimentSchemaV1: any, evidenceSchemaV1: any, mechanisticEstimateSchemaV1: any, evidenceEdgeSchemaV1: any}} schemas Caller-provided record validators.
 * @returns {{valid: true, graph: InterpretabilityGraphV1 & {experiments: Array<InterpretabilityRecord>}}|{valid: false, errors: Array<Record<string, string|number|undefined>>}} Reconstructed graph or validation errors.
 */
export function importEvidenceGraphV1(json, schemas) {
  if (typeof json !== 'string') {
    return importFailure('invalid-json');
  }

  let parsedDocument;
  try {
    parsedDocument = JSON.parse(json);
  } catch {
    return importFailure('invalid-json');
  }
  if (
    !parsedDocument ||
    typeof parsedDocument !== 'object' ||
    Array.isArray(parsedDocument)
  ) {
    return importFailure('invalid-document');
  }
  if (parsedDocument.schemaVersion !== 1) {
    return importFailure('unsupported-version', {
      schemaVersion: parsedDocument.schemaVersion,
    });
  }

  const collections = [
    ['mechanisms', schemas?.mechanismSchemaV1],
    ['hypotheses', schemas?.hypothesisSchemaV1],
    ['experiments', schemas?.experimentSchemaV1],
    ['estimates', schemas?.mechanisticEstimateSchemaV1],
    ['evidence', schemas?.evidenceSchemaV1],
    ['edges', schemas?.evidenceEdgeSchemaV1],
  ];
  const errors = collections.flatMap(([collection, schema]) =>
    Array.isArray(parsedDocument[collection])
      ? validateSubmissionRecords(
          collection,
          parsedDocument[collection],
          schema
        )
      : [{ code: 'invalid-collection', collection }]
  );
  if (errors.length > 0) return { valid: false, errors };

  const graph = Object.fromEntries(
    collections.map(([collection]) => [collection, parsedDocument[collection]])
  );
  const validationFailure = validateGraphInput(graph);
  if (validationFailure) return validationFailure;
  return { valid: true, graph };
}

/**
 * Validate and append one experiment submission without mutating its source graph.
 * @param {InterpretabilityGraphV1} graph Existing versioned evidence graph.
 * @param {{experiment: InterpretabilityRecord, evidence: Array<InterpretabilityRecord>, edges?: Array<InterpretabilityRecord>}} submission Experiment and its submitted evidence links.
 * @param {{experimentSchemaV1: any, evidenceSchemaV1: any, evidenceEdgeSchemaV1: any}} schemas Caller-provided validators.
 * @returns {{valid: true, graph: InterpretabilityGraphV1}|{valid: false, errors: Array<Record<string, string|number|undefined>>}} Appended graph or validation errors.
 */
export function appendExperimentSubmissionV1(graph, submission, schemas) {
  const validationFailure = validateGraphInput(graph);
  if (validationFailure) return validationFailure;

  if (
    !submission ||
    typeof submission !== 'object' ||
    !submission.experiment ||
    !Array.isArray(submission.evidence) ||
    submission.evidence.length === 0 ||
    (submission.edges !== undefined && !Array.isArray(submission.edges))
  ) {
    return { valid: false, errors: [{ code: 'invalid-submission' }] };
  }

  const records = [
    {
      collection: 'experiments',
      items: [submission.experiment],
      schema: schemas?.experimentSchemaV1,
    },
    {
      collection: 'evidence',
      items: submission.evidence,
      schema: schemas?.evidenceSchemaV1,
    },
    {
      collection: 'edges',
      items: submission.edges ?? [],
      schema: schemas?.evidenceEdgeSchemaV1,
    },
  ];
  const errors = records.flatMap(({ collection, items, schema }) =>
    validateSubmissionRecords(collection, items, schema)
  );
  if (errors.length > 0) return { valid: false, errors };

  const candidate = {
    ...graph,
    experiments: [...(graph.experiments ?? []), submission.experiment],
    evidence: [...(graph.evidence ?? []), ...submission.evidence],
    edges: [...(graph.edges ?? []), ...(submission.edges ?? [])],
  };
  const candidateValidation = validateEvidenceGraphV1(candidate);
  return candidateValidation.valid
    ? { valid: true, graph: candidate }
    : { valid: false, errors: candidateValidation.errors };
}

/**
 * Validate and append one versioned mechanistic estimate without mutating its source graph.
 * @param {InterpretabilityGraphV1} graph Existing versioned evidence graph.
 * @param {InterpretabilityRecord} estimate Submitted whole-model estimate.
 * @param {{mechanisticEstimateSchemaV1: any}} schemas Caller-provided estimate validator.
 * @returns {{valid: true, graph: InterpretabilityGraphV1}|{valid: false, errors: Array<Record<string, string|number|undefined>>}} Appended graph or validation errors.
 */
export function appendMechanisticEstimateV1(graph, estimate, schemas) {
  const validationFailure = validateGraphInput(graph);
  if (validationFailure) return validationFailure;

  if (!estimate || typeof estimate !== 'object' || Array.isArray(estimate)) {
    return { valid: false, errors: [{ code: 'invalid-submission' }] };
  }

  const errors = validateSubmissionRecords(
    'estimates',
    [estimate],
    schemas?.mechanisticEstimateSchemaV1
  );
  if (errors.length > 0) return { valid: false, errors };

  const candidate = {
    ...graph,
    estimates: [...(graph.estimates ?? []), estimate],
  };
  const candidateValidation = validateEvidenceGraphV1(candidate);
  return candidateValidation.valid
    ? { valid: true, graph: candidate }
    : { valid: false, errors: candidateValidation.errors };
}

/**
 * Append one linked accuracy evaluation without changing its source bundle.
 * @param {Record<string, any>} bundle Portable V4 research bundle.
 * @param {AccuracyEvaluationRecordV1} evaluation Submitted report and estimate links.
 * @param {Record<string, any>} schemas Injected report and subgraph schemas.
 * @returns {{valid: true, bundle: Record<string, any>}|{valid: false, errors: Array<Record<string, any>>}} Appended bundle or validation errors.
 */
export function appendAccuracyEvaluationV1(bundle, evaluation, schemas) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    return { valid: false, errors: [{ code: 'invalid-research-bundle' }] };
  }
  const graphFailure = validateGraphInput(bundle.evidenceGraph);
  if (graphFailure) return graphFailure;
  const existing = bundle.accuracyEvaluations ?? [];
  const currentValidation = validateAccuracyEvaluationCollection(
    bundle.evidenceGraph,
    existing,
    schemas
  );
  if (!currentValidation.valid) return currentValidation;

  const candidateEvaluations = [...currentValidation.records, evaluation];
  const candidateValidation = validateAccuracyEvaluationCollection(
    bundle.evidenceGraph,
    candidateEvaluations,
    schemas
  );
  return candidateValidation.valid
    ? {
        valid: true,
        bundle: {
          ...bundle,
          accuracyEvaluations: candidateValidation.records,
        },
      }
    : { valid: false, errors: candidateValidation.errors };
}

/**
 * Append an attributable additive identity-reference claim without mutating
 * the submitted bundle or any earlier claim.
 * @param {Record<string, any>} bundle Portable research bundle.
 * @param {Record<string, any>} claim Submitted identity-reference claim.
 * @param {Record<string, any>} schemas Injected identity-reference schema.
 * @returns {{valid: true, bundle: Record<string, any>}|{valid: false, errors: Array<{code: string}>}} Appended bundle or validation errors.
 */
export function appendIdentityReferenceV1(bundle, claim, schemas) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    return { valid: false, errors: [{ code: 'invalid-research-bundle' }] };
  }
  const current = summarizeIdentityReferencesV1(
    bundle.identityReferences ?? [],
    identityReferenceSchema(schemas)
  );
  if (!current.valid) return current;
  const appended = summarizeIdentityReferencesV1(
    [...current.claims, claim],
    identityReferenceSchema(schemas)
  );
  return appended.valid
    ? {
        valid: true,
        bundle: { ...bundle, identityReferences: appended.claims },
      }
    : appended;
}

/**
 * Parse submitted records with an injected schema and report stable failures.
 * @param {string} collection Graph collection name.
 * @param {Array<InterpretabilityRecord>} records Submitted records.
 * @param {any} schema Caller-provided record schema.
 * @returns {Array<Record<string, string|number|undefined>>} Stable validation errors.
 */
function validateSubmissionRecords(collection, records, schema) {
  if (!schema || typeof schema.safeParse !== 'function') {
    return [{ code: 'missing-schema-validator', collection }];
  }
  return records.flatMap((record, index) =>
    schema.safeParse(record).success
      ? []
      : [{ code: 'invalid-record', collection, index, id: record?.id }]
  );
}

/**
 * Build a stable single-error import result.
 * @param {string} code Import failure code.
 * @param {Record<string, string|number|undefined>} [details] Additional error data.
 * @returns {{valid: false, errors: Array<Record<string, string|number|undefined>>}} Import failure.
 */
function importFailure(code, details = {}) {
  return { valid: false, errors: [{ code, ...details }] };
}

/**
 * Return a bounded context page reachable from one mechanism through stored graph edges.
 * @param {InterpretabilityGraphV1} graph Versioned graph collections.
 * @param {{mechanismId: string, maxDepth?: number, pageSize?: number, cursor?: {type: 'record'|'edge', id: string}|null}} query Context query and pagination cursor.
 * @returns {{valid: true, mechanism: InterpretabilityRecord, items: Array<Record<string, any>>, totalItems: number, nextCursor: {type: 'record'|'edge', id: string}|null, warnings: Array<ContextWarningV1>}|{valid: false, errors: Array<Record<string, string>>}} Reachable context page or validation errors.
 */
export function getEvidenceGraphContextV1(graph, query) {
  const validationFailure = validateGraphInput(graph);
  if (validationFailure) return validationFailure;

  const parsedQuery = validateContextQueryV1(query);
  if (!parsedQuery.valid) return parsedQuery;
  const { mechanismId, maxDepth, pageSize, cursor } = parsedQuery;
  const recordsById = indexGraphRecords(graph);
  const mechanismEntry = recordsById.get(mechanismId);
  if (!mechanismEntry || mechanismEntry.collection !== 'mechanisms') {
    return {
      valid: false,
      errors: [{ code: 'unknown-mechanism', mechanismId }],
    };
  }

  const context = collectGraphContext(
    graph,
    mechanismId,
    maxDepth,
    recordsById
  );
  const page = paginateContextItems(context.items, pageSize, cursor);
  if (!page.valid) return page;

  return {
    valid: true,
    mechanism: mechanismEntry.record,
    items: page.items,
    totalItems: context.items.length,
    nextCursor: page.nextCursor,
    warnings: buildContextWarnings(mechanismId, context.records),
  };
}

/**
 * Present one bounded context page as separate hypothesis, evidence, experiment,
 * and relationship collections while retaining its raw items and pagination.
 * @param {ReturnType<typeof getEvidenceGraphContextV1>} context Context page or failure.
 * @returns {PresentedEvidenceGraphContextResultV1} Typed presentation or unchanged failure.
 */
export function presentEvidenceGraphContextV1(context) {
  if (!context.valid) return context;

  const records = context.items.filter(item => item.itemType === 'record');
  return {
    ...context,
    hypotheses: records
      .filter(item => item.collection === 'hypotheses')
      .map(item => item.record),
    evidence: records
      .filter(item => item.collection === 'evidence')
      .map(item => item.record),
    experiments: records
      .filter(item => item.collection === 'experiments')
      .map(item => item.record),
    relationships: context.items
      .filter(item => item.itemType === 'edge')
      .map(item => item.record),
  };
}

/**
 * Validate graph invariants and return the shared failure result when invalid.
 * @param {InterpretabilityGraphV1} graph Candidate graph.
 * @returns {{valid: false, errors: Array<Record<string, string>>}|null} Validation error or null.
 */
function validateGraphInput(graph) {
  const validation = validateEvidenceGraphV1(graph);
  return validation.valid ? null : { valid: false, errors: validation.errors };
}

/**
 * Validate and normalize context query defaults.
 * @param {any} query Candidate context request.
 * @returns {{valid: true, mechanismId: string, maxDepth: number, pageSize: number, cursor: {type: 'record'|'edge', id: string}|null}|{valid: false, errors: Array<Record<string, string>>}} Normalized request or errors.
 */
function validateContextQueryV1(query) {
  if (!query || typeof query !== 'object') {
    return { valid: false, errors: [{ code: 'invalid-query' }] };
  }
  const { mechanismId, cursor = null } = query;
  const maxDepth = query.maxDepth ?? 2;
  const pageSize = query.pageSize ?? 20;
  const errors = [];
  if (typeof mechanismId !== 'string' || mechanismId.trim() === '') {
    errors.push({ code: 'invalid-mechanism-id' });
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 4) {
    errors.push({ code: 'invalid-depth' });
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    errors.push({ code: 'invalid-page-size' });
  }
  if (cursor !== null && !isContextCursor(cursor)) {
    errors.push({ code: 'invalid-cursor' });
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, mechanismId, maxDepth, pageSize, cursor };
}

/**
 * @param {any} cursor Candidate page cursor.
 * @returns {boolean} Whether the cursor has the supported shape.
 */
function isContextCursor(cursor) {
  return (
    typeof cursor === 'object' &&
    ['record', 'edge'].includes(cursor.type) &&
    typeof cursor.id === 'string' &&
    cursor.id.trim() !== ''
  );
}

/**
 * Index graph records by ID while retaining their collection.
 * @param {InterpretabilityGraphV1} graph Validated graph.
 * @returns {Map<string, GraphRecordEntryV1>} Records by global ID.
 */
function indexGraphRecords(graph) {
  const collections = [
    'mechanisms',
    'hypotheses',
    'experiments',
    'estimates',
    'evidence',
  ];
  const graphCollections =
    /** @type {Record<string, Array<InterpretabilityRecord>|undefined>} */ (
      graph
    );
  const recordsById = new Map();
  for (const collection of collections) {
    for (const record of graphCollections[collection] ?? []) {
      recordsById.set(record.id, { id: record.id, collection, record });
    }
  }
  return recordsById;
}

/**
 * Collect nearest nodes and stored directed edges around one mechanism.
 * @param {InterpretabilityGraphV1} graph Validated graph.
 * @param {string} mechanismId Mechanism identifier.
 * @param {number} maxDepth Maximum number of explicit edges to traverse.
 * @param {Map<string, GraphRecordEntryV1>} recordsById Records by global ID.
 * @returns {{items: Array<ContextItemV1>, records: Array<GraphRecordEntryV1>}} Stable reachable items and node records.
 */
function collectGraphContext(graph, mechanismId, maxDepth, recordsById) {
  const depths = new Map([[mechanismId, 0]]);
  const selectedEdgeIds = new Set();
  const edges = [...(graph.edges ?? [])].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const frontier = [...depths]
      .filter(([, currentDepth]) => currentDepth === depth)
      .map(([id]) => id);
    for (const id of frontier) {
      for (const edge of edges) {
        if (edge.fromId !== id && edge.toId !== id) continue;
        selectedEdgeIds.add(edge.id);
        const neighborId = edge.fromId === id ? edge.toId : edge.fromId;
        if (!depths.has(neighborId)) depths.set(neighborId, depth + 1);
      }
    }
  }

  const reachableEntries = [...depths]
    .filter(([id, depth]) => id !== mechanismId && depth <= maxDepth)
    .map(([id, depth]) => ({
      depth,
      entry: /** @type {GraphRecordEntryV1} */ (recordsById.get(id)),
    }));
  /** @type {Array<ContextItemV1>} */
  const contextRecords = reachableEntries.map(({ depth, entry }) => ({
    itemType: /** @type {'record'} */ ('record'),
    id: entry.id,
    depth,
    collection: entry.collection,
    record: entry.record,
  }));
  const contextEdges = edges
    .filter(edge => selectedEdgeIds.has(edge.id))
    .map(record => ({
      itemType: /** @type {'edge'} */ ('edge'),
      id: record.id,
      record,
    }));
  const items = [...contextRecords, ...contextEdges].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
  return {
    items,
    records: reachableEntries.map(({ entry }) => entry),
  };
}

/**
 * Select one stable page after a typed cursor.
 * @param {Array<ContextItemV1>} items Ordered context items.
 * @param {number} pageSize Maximum items to return.
 * @param {{type: 'record'|'edge', id: string}|null} cursor Position from a previous page.
 * @returns {{valid: true, items: Array<ContextItemV1>, nextCursor: {type: 'record'|'edge', id: string}|null}|{valid: false, errors: Array<Record<string, string>>}} Page or cursor error.
 */
function paginateContextItems(items, pageSize, cursor) {
  const cursorIndex = cursor
    ? items.findIndex(
        item => item.itemType === cursor.type && item.id === cursor.id
      )
    : -1;
  if (cursor !== null && cursorIndex < 0) {
    return {
      valid: false,
      errors: [{ code: 'unknown-cursor', cursorId: cursor.id }],
    };
  }
  const pageItems = items.slice(cursorIndex + 1, cursorIndex + 1 + pageSize);
  const hasMore = cursorIndex + 1 + pageSize < items.length;
  const lastItem = pageItems.at(-1);
  return {
    valid: true,
    items: pageItems,
    nextCursor:
      hasMore && lastItem ? { type: lastItem.itemType, id: lastItem.id } : null,
  };
}

/**
 * Describe absent or unverified context without suppressing the underlying records.
 * @param {string} mechanismId Requested mechanism identifier.
 * @param {Array<{id: string, collection: string, record: InterpretabilityRecord}>} records Reachable graph records.
 * @returns {Array<ContextWarningV1>} Stable context warning list.
 */
function buildContextWarnings(mechanismId, records) {
  /** @type {Array<ContextWarningV1>} */
  const warnings = [];
  for (const collection of ['hypotheses', 'experiments', 'evidence']) {
    if (!records.some(item => item.collection === collection)) {
      warnings.push({ code: `missing-${collection}`, mechanismId });
    }
  }
  for (const { collection, record } of records) {
    if (collection === 'hypotheses') {
      if (record.status !== 'reproduced') {
        warnings.push({
          code: 'hypothesis-not-reproduced',
          id: record.id,
          status: record.status,
        });
      }
      if (typeof record.confidence !== 'number') {
        warnings.push({
          code: 'hypothesis-confidence-unspecified',
          id: record.id,
        });
      }
    }
    if (collection === 'experiments') {
      addStatusWarning(warnings, record, 'experiment-not-completed');
    }
    if (collection === 'evidence') {
      addStatusWarning(warnings, record, 'evidence-not-reproduced');
    }
  }
  return warnings.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right))
  );
}

/**
 * Preserve a non-final record status as explicit uncertainty metadata.
 * @param {Array<ContextWarningV1>} warnings Warning accumulator.
 * @param {InterpretabilityRecord} record Linked graph record.
 * @param {'experiment-not-completed'|'evidence-not-reproduced'} warningCode Warning identifier.
 */
function addStatusWarning(warnings, record, warningCode) {
  const statusField =
    warningCode === 'experiment-not-completed' ? 'status' : 'validationState';
  const completedValue =
    warningCode === 'experiment-not-completed' ? 'completed' : 'reproduced';
  if (record[statusField] !== completedValue) {
    warnings.push({
      code: warningCode,
      id: record.id,
      [statusField]: record[statusField],
    });
  }
}

/** @typedef {{id: string, collection: string, record: InterpretabilityRecord}} GraphRecordEntryV1 */
/** @typedef {({itemType: 'record', id: string, depth: number}&GraphRecordEntryV1)|{itemType: 'edge', id: string, record: InterpretabilityRecord}} ContextItemV1 */
/** @typedef {{code: string, mechanismId?: string, id?: string, status?: string, validationState?: string}} ContextWarningV1 */
/** @typedef {Extract<ReturnType<typeof getEvidenceGraphContextV1>, {valid: true}>} EvidenceGraphContextPageV1 */
/** @typedef {EvidenceGraphContextPageV1 & {hypotheses: Array<InterpretabilityRecord>, evidence: Array<InterpretabilityRecord>, experiments: Array<InterpretabilityRecord>, relationships: Array<InterpretabilityRecord>}} PresentedEvidenceGraphContextPageV1 */
/** @typedef {Extract<ReturnType<typeof getEvidenceGraphContextV1>, {valid: false}>|PresentedEvidenceGraphContextPageV1} PresentedEvidenceGraphContextResultV1 */
