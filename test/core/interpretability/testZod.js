import { createRequire } from 'node:module';

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
  if (config.datetime && Number.isNaN(Date.parse(value))) throw new TypeError();
}

/**
 * @param {any} value Value to validate.
 * @param {Record<string, any>} config Number constraints.
 */
function validateNumber(value, config) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new TypeError();
  if (config.integer && !Number.isInteger(value)) throw new TypeError();
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
      type: schema.kind,
      oneOf:
        schema.kind === 'discriminated-union'
          ? schema.config.options
          : undefined,
    }),
  };
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
    if (moduleError.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return { zod: createTestZod(), source: 'fallback' };
  }
}
