/**
 * Construct interpretability schemas with a caller-provided Zod API. Keeping
 * Zod outside core preserves core's dependency boundary while retaining Zod's
 * parsing and JSON Schema generation behavior.
 * @param {any} z Injected Zod namespace.
 * @returns {Record<string, any>} Runtime schemas and their JSON Schema forms.
 */
export function createInterpretabilitySchemasV1(z) {
  const schemaVersion = z.literal(1);
  const pinnedModel = z
    .object({
      modelId: z.string().min(1),
      repository: z.string().url(),
      revision: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
    })
    .strict();
  const mechanismBase = {
    schemaVersion,
    model: pinnedModel,
    layerIndex: z.number().int().nonnegative(),
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
      revision: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
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
