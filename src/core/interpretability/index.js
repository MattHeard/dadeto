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

/**
 * Sort a graph collection by its stable record ID for portable export.
 * @param {Array<InterpretabilityRecord>} records Graph records.
 * @returns {Array<InterpretabilityRecord>} Sorted copy of the records.
 */
function sortGraphRecords(records) {
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
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

  const document = {
    schemaVersion: 1,
    mechanisms: sortGraphRecords(graph.mechanisms ?? []),
    hypotheses: sortGraphRecords(graph.hypotheses ?? []),
    experiments: sortGraphRecords(graph.experiments ?? []),
    estimates: sortGraphRecords(graph.estimates ?? []),
    evidence: sortGraphRecords(graph.evidence ?? []),
    edges: sortGraphRecords(graph.edges ?? []),
  };
  return { valid: true, json: JSON.stringify(document) };
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
