/**
 * Construct interpretability schemas with a caller-provided Zod API. Keeping
 * Zod outside core preserves core's dependency boundary while retaining Zod's
 * parsing and JSON Schema generation behavior.
 * @param {any} z Injected Zod namespace.
 * @returns {Record<string, any>} Runtime schemas and their JSON Schema forms.
 */
export function createInterpretabilitySchemasV1(z) {
  const schemaVersion = z.literal(1);
  const commitRevision = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  const tokenizer = z
    .object({
      repository: z.string().url(),
      revision: commitRevision,
    })
    .strict();
  const pinnedModel = z
    .object({
      modelId: z.string().min(1),
      repository: z.string().url(),
      revision: commitRevision,
      architecture: z.string().min(1),
      tokenizer,
    })
    .strict();
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

/** @typedef {Record<string, any>} InterpretabilityRecord */
/** @typedef {{mechanisms?: Array<InterpretabilityRecord>, hypotheses?: Array<InterpretabilityRecord>, experiments?: Array<InterpretabilityRecord>, evidence?: Array<InterpretabilityRecord>, estimates?: Array<InterpretabilityRecord>, edges?: Array<InterpretabilityRecord>}} InterpretabilityGraphV1 */

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
