import { createRequire } from 'node:module';

const JSON_SCHEMA_DRAFT_URL = 'https://json-schema.org/draft/2020-12/schema';
const ISO_DATETIME_PATTERN =
  /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z))$/u;

const require = createRequire(`${process.cwd()}/package.json`);

/**
 * @param {string} kind Schema kind.
 * @param {Record<string, any>} [config] Schema-specific configuration.
 * @returns {Record<string, any>} Schema test double.
 */
function makeSchema(kind, config = {}) {
  const schema = {
    kind,
    config,
    parse(value) {
      return parseValue(schema, value);
    },
    safeParse(value) {
      try {
        return { success: true, data: schema.parse(value) };
      } catch (error) {
        return { success: false, error };
      }
    },
    min(value) {
      return makeSchema(kind, { ...config, min: value });
    },
    max(value) {
      return makeSchema(kind, { ...config, max: value });
    },
    int() {
      return makeSchema(kind, { ...config, integer: true });
    },
    nonnegative() {
      return makeSchema(kind, { ...config, min: 0 });
    },
    positive() {
      return makeSchema(kind, { ...config, min: 0, exclusiveMin: true });
    },
    regex(value) {
      return makeSchema(kind, { ...config, pattern: value });
    },
    url() {
      return makeSchema(kind, { ...config, url: true });
    },
    datetime() {
      return makeSchema(kind, { ...config, datetime: true });
    },
    optional() {
      return makeSchema(kind, { ...config, optional: true });
    },
    strict() {
      return makeSchema(kind, { ...config, strict: true });
    },
    refine(predicate) {
      return makeSchema(kind, { ...config, predicate });
    },
  };
  return schema;
}

/**
 * @param {Record<string, any>} schema Schema to parse with.
 * @param {any} value Input value.
 * @returns {any} Parsed value.
 */
function parseValue(schema, value) {
  const { kind, config } = schema;
  if (config.optional && value === undefined) return value;
  if (kind === 'string') validateString(value, config);
  if (kind === 'number') validateNumber(value, config);
  if (kind === 'boolean' && typeof value !== 'boolean') throw new TypeError();
  if (kind === 'literal' && value !== config.value) throw new TypeError();
  if (kind === 'enum' && !config.values.includes(value)) throw new TypeError();
  if (kind === 'object') validateObject(value, config);
  if (kind === 'array') validateArray(value, config);
  if (kind === 'record') validateRecord(value, config);
  if (kind === 'union') validateUnion(value, config);
  if (kind === 'discriminated-union') validateDiscriminatedUnion(value, config);
  if (config.predicate && !config.predicate(value)) throw new TypeError();
  return value;
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config String constraints.
 */
function validateString(value, config) {
  if (typeof value !== 'string') throw new TypeError();
  if (config.min !== undefined && value.length < config.min)
    throw new TypeError();
  if (config.pattern && !config.pattern.test(value)) throw new TypeError();
  if (config.url) {
    try {
      new URL(value);
    } catch {
      throw new TypeError();
    }
  }
  if (config.datetime && !ISO_DATETIME_PATTERN.test(value))
    throw new TypeError();
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config Number constraints.
 */
function validateNumber(value, config) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new TypeError();
  if (config.integer && !Number.isSafeInteger(value)) throw new TypeError();
  if (config.min !== undefined && value < config.min) throw new TypeError();
  if (config.max !== undefined && value > config.max) throw new TypeError();
  if (config.exclusiveMin && value === config.min) throw new TypeError();
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config Object shape and constraints.
 */
function validateObject(value, config) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError();
  for (const [key, child] of Object.entries(config.shape)) {
    if (!(child.config.optional && value[key] === undefined))
      child.parse(value[key]);
  }
  if (config.strict && Object.keys(value).some(key => !(key in config.shape)))
    throw new TypeError();
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config Array item schema and constraints.
 */
function validateArray(value, config) {
  if (!Array.isArray(value) || value.length < (config.min ?? 0))
    throw new TypeError();
  value.forEach(item => config.item.parse(item));
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config Record key and value schemas.
 */
function validateRecord(value, config) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError();
  Object.entries(value).forEach(([key, item]) => {
    config.key.parse(key);
    config.value.parse(item);
  });
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config Union option schemas.
 */
function validateUnion(value, config) {
  const matching = config.options.some(
    option => option.safeParse(value).success
  );
  if (!matching) throw new TypeError();
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config Discriminator and branch schemas.
 */
function validateDiscriminatedUnion(value, config) {
  const match = config.options.find(
    option =>
      option.config.shape[config.discriminator].config.value ===
      value?.[config.discriminator]
  );
  if (!match) throw new TypeError();
  match.parse(value);
}

/**
 * Minimal injected schema-builder double used to keep tests independent of Zod.
 * @returns {Record<string, any>} The schema-builder API double.
 */
export function createTestZod() {
  return {
    string: () => makeSchema('string'),
    number: () => makeSchema('number'),
    boolean: () => makeSchema('boolean'),
    literal: value => makeSchema('literal', { value }),
    enum: values => makeSchema('enum', { values }),
    object: shape => makeSchema('object', { shape }),
    strictObject: shape => makeSchema('object', { shape, strict: true }),
    array: item => makeSchema('array', { item }),
    record: (key, value) => makeSchema('record', { key, value }),
    union: options => makeSchema('union', { options }),
    discriminatedUnion: (discriminator, options) =>
      makeSchema('discriminated-union', { discriminator, options }),
    iso: { datetime: () => makeSchema('string', { datetime: true }) },
    toJSONSchema: schema => ({
      $schema: JSON_SCHEMA_DRAFT_URL,
      ...toJsonSchema(schema),
    }),
  };
}

/**
 * Convert the schema-double representation to the JSON Schema subset emitted
 * by Zod v4 for the production interpretability schema factory.
 * @param {Record<string, any>} schema Schema to convert.
 * @returns {Record<string, any>} JSON Schema representation.
 */
function toJsonSchema(schema) {
  const { kind, config } = schema;
  if (kind === 'string') return jsonSchemaForString(config);
  if (kind === 'number') return jsonSchemaForNumber(config);
  if (kind === 'boolean') return { type: 'boolean' };
  if (kind === 'literal') {
    return { type: typeof config.value, const: config.value };
  }
  if (kind === 'enum') {
    return { type: typeof config.values[0], enum: config.values };
  }
  if (kind === 'object') return jsonSchemaForObject(config);
  if (kind === 'array') return jsonSchemaForArray(config);
  if (kind === 'record') return jsonSchemaForRecord(config);
  if (kind === 'union') return jsonSchemaForUnion(config.options);
  if (kind === 'discriminated-union')
    return { oneOf: config.options.map(toJsonSchema) };
  throw new TypeError(['Unsupported test schema kind: ', kind].join(''));
}

/**
 * @param {Record<string, any>} config String schema configuration.
 * @returns {Record<string, any>} String JSON Schema.
 */
function jsonSchemaForString(config) {
  const result = { type: 'string' };
  if (config.min !== undefined) result.minLength = config.min;
  if (config.pattern) result.pattern = config.pattern.source;
  if (config.url) result.format = 'uri';
  if (config.datetime) {
    result.format = 'date-time';
    result.pattern = ISO_DATETIME_PATTERN.source;
  }
  return result;
}

/**
 * @param {Record<string, any>} config Number schema configuration.
 * @returns {Record<string, any>} Number JSON Schema.
 */
function jsonSchemaForNumber(config) {
  const result = { type: config.integer ? 'integer' : 'number' };
  if (config.min !== undefined) {
    result[config.exclusiveMin ? 'exclusiveMinimum' : 'minimum'] = config.min;
  }
  if (config.max !== undefined) result.maximum = config.max;
  else if (config.integer) result.maximum = Number.MAX_SAFE_INTEGER;
  return result;
}

/**
 * @param {Record<string, any>} config Object schema configuration.
 * @returns {Record<string, any>} Object JSON Schema.
 */
function jsonSchemaForObject(config) {
  const properties = {};
  const required = [];
  for (const [key, child] of Object.entries(config.shape)) {
    properties[key] = toJsonSchema(child);
    if (!child.config.optional) required.push(key);
  }
  const result = { type: 'object', properties };
  if (required.length) result.required = required;
  if (config.strict) result.additionalProperties = false;
  return result;
}

/**
 * @param {Record<string, any>} config Array schema configuration.
 * @returns {Record<string, any>} Array JSON Schema.
 */
function jsonSchemaForArray(config) {
  const result = { type: 'array', items: toJsonSchema(config.item) };
  if (config.min !== undefined) result.minItems = config.min;
  return result;
}

/**
 * @param {Record<string, any>} config Record schema configuration.
 * @returns {Record<string, any>} Record JSON Schema.
 */
function jsonSchemaForRecord(config) {
  return {
    type: 'object',
    propertyNames: toJsonSchema(config.key),
    additionalProperties: toJsonSchema(config.value),
  };
}

/**
 * @param {Array<Record<string, any>>} options Union schema options.
 * @returns {Record<string, any>} Union JSON Schema.
 */
function jsonSchemaForUnion(options) {
  const schemas = options.map(toJsonSchema);
  const types = schemas.map(schema => schema.type);
  if (
    types.every(type => typeof type === 'string') &&
    new Set(types).size === types.length
  ) {
    return { type: types };
  }
  return { anyOf: schemas };
}

/**
 * Load real Zod when available, with a local test double for dependency-free runs.
 * Set DADETO_TEST_WITHOUT_ZOD=1 to exercise the fallback explicitly.
 * @returns {{zod: Record<string, any>, source: 'zod' | 'fallback'}} Schema API and selected source.
 */
export function loadOptionalTestZod() {
  if (process.env.DADETO_TEST_WITHOUT_ZOD === '1') {
    return { zod: createTestZod(), source: 'fallback' };
  }

  try {
    const { z } = require('zod/v4');
    return { zod: z, source: 'zod' };
  } catch (error) {
    const moduleError = /** @type {Error & {code?: string}} */ (error);
    if (
      moduleError.code !== 'MODULE_NOT_FOUND' &&
      moduleError.code !== 'ERR_MODULE_NOT_FOUND'
    ) {
      throw error;
    }
    return { zod: createTestZod(), source: 'fallback' };
  }
}
