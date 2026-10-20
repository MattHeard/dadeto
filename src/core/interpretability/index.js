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
  const pinnedModel = z
    .object({
      modelId: z.string().min(1),
      repository: z.string().url(),
      revision: commitRevision,
      architecture: z.string().min(1),
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
  });

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

  return Object.freeze({
    mechanismSchemaV1,
    hypothesisSchemaV1,
    experimentSchemaV1,
    evidenceSchemaV1,
    evidenceEdgeSchemaV1,
    mechanisticEstimateSchemaV1,
    interpretabilityJsonSchemasV1: Object.freeze({
      mechanism: z.toJSONSchema(mechanismSchemaV1),
      hypothesis: z.toJSONSchema(hypothesisSchemaV1),
      experiment: z.toJSONSchema(experimentSchemaV1),
      evidence: z.toJSONSchema(evidenceSchemaV1),
      evidenceEdge: z.toJSONSchema(evidenceEdgeSchemaV1),
      mechanisticEstimate: z.toJSONSchema(mechanisticEstimateSchemaV1),
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
      recurrentActivationPositionSchemaV2,
      activationObservationSchemaV2,
      structuralConnectionSchemaV2,
      circuitStructuralSnapshotSchemaV2,
    },
    hashCanonicalIdentity
  );

  return Object.freeze({
    recurrentNeuronComponentSchemaV2,
    recurrentActivationPositionSchemaV2,
    activationObservationSchemaV2,
    structuralConnectionSchemaV2,
    circuitStructuralSnapshotSchemaV2,
    identityGraphSchemaV2,
    interpretabilityJsonSchemasV2: Object.freeze({
      recurrentNeuronComponent: z.toJSONSchema(
        recurrentNeuronComponentSchemaV2
      ),
      recurrentActivationPosition: z.toJSONSchema(
        recurrentActivationPositionSchemaV2
      ),
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
      components: z.array(schemas.recurrentNeuronComponentSchemaV2),
      activationPositions: z.array(schemas.recurrentActivationPositionSchemaV2),
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
  return JSON.stringify([
    model.modelId,
    model.repository,
    model.revision,
    model.architecture,
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
  const coordinateIdentity = [
    component.model.modelId,
    component.model.repository,
    component.model.architecture,
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
 * Derive a stable ID for one input- and run-specific activation measurement.
 * @param {string} activationPositionId Recurrent position identity.
 * @param {string} experimentId Experiment identity.
 * @param {{inputSequenceId: string, runId: string, value: number, numericPrecision: string}} measurement Input-specific measured value and run identity.
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

/** @typedef {Record<string, any>} InterpretabilityRecord */
/** @typedef {{mechanisms?: Array<InterpretabilityRecord>, hypotheses?: Array<InterpretabilityRecord>, experiments?: Array<InterpretabilityRecord>, evidence?: Array<InterpretabilityRecord>, estimates?: Array<InterpretabilityRecord>, edges?: Array<InterpretabilityRecord>}} InterpretabilityGraphV1 */
/** @typedef {{mechanismSchemaV1: any, hypothesisSchemaV1: any, experimentSchemaV1: any, evidenceSchemaV1: any, mechanisticEstimateSchemaV1: any, evidenceEdgeSchemaV1: any}} InterpretabilitySchemasV1 */

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
 * Export V1 evidence and V2 identities in one versioned research bundle.
 * @param {{evidenceGraph: InterpretabilityGraphV1, identityGraph: Record<string, any>}} bundle Portable research subgraphs.
 * @param {{evidenceGraphSchemasV1: InterpretabilitySchemasV1, identityGraphSchemaV2: any}} schemas Injected subgraph schemas.
 * @returns {{valid: true, json: string}|{valid: false, errors: Array<Record<string, any>>}} Bundle export result.
 */
export function exportInterpretabilityResearchBundleV2(bundle, schemas) {
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
    schemas?.identityGraphSchemaV2
  );
  if (!identityResult.valid) {
    return researchBundleFailure(
      'invalid-identity-graph',
      identityResult.errors
    );
  }
  return {
    valid: true,
    json: JSON.stringify({
      schemaVersion: 2,
      evidenceGraph: { schemaVersion: 1, ...evidenceResult.graph },
      identityGraph: { schemaVersion: 2, ...identityResult.graph },
    }),
  };
}

/**
 * Import and validate both subgraphs in a portable research bundle.
 * @param {string} json Portable research bundle JSON.
 * @param {{evidenceGraphSchemasV1: InterpretabilitySchemasV1, identityGraphSchemaV2: any}} schemas Injected subgraph schemas.
 * @returns {{valid: true, bundle: {evidenceGraph: InterpretabilityGraphV1, identityGraph: Record<string, any>}}|{valid: false, errors: Array<Record<string, any>>}} Bundle import result.
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
  if (envelope.schemaVersion !== 2) {
    return researchBundleFailure('unsupported-version');
  }
  if (
    Object.keys(envelope).some(
      key => !['schemaVersion', 'evidenceGraph', 'identityGraph'].includes(key)
    )
  ) {
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
    schemas?.identityGraphSchemaV2
  );
  if (!identityResult.valid) {
    return researchBundleFailure(
      'invalid-identity-graph',
      identityResult.errors
    );
  }
  return {
    valid: true,
    bundle: {
      evidenceGraph: evidenceResult.graph,
      identityGraph: identityResult.graph,
    },
  };
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
 * @returns {{valid: true, graph: InterpretabilityGraphV1}|{valid: false, errors: Array<Record<string, string|number|undefined>>}} Reconstructed graph or validation errors.
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
