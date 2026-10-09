/** @typedef {import('../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * @template {(...args: never[]) => unknown} F
 * @typedef {(this: ThisParameterType<F>, permission: AllowEffects, ...args: Parameters<F>) => ReturnType<F>} EffectfulCallable
 */

/**
 * Require an explicit AllowEffects value before invoking a raw callable.
 *
 * This preserves a single non-generic call signature, its parameter tuple,
 * return type, caller `this`, and synchronous/asynchronous behavior. TypeScript
 * represents overloaded callables through their last overload in
 * `Parameters<F>` and `ReturnType<F>`; generic call signatures also lose their
 * per-call type relationship. Adapt those APIs with an explicitly typed named
 * wrapper instead of treating this helper as universally transparent.
 *
 * @template {(...args: never[]) => unknown} F
 * @param {F} callable Raw operation, invoked only after the caller supplies a permission.
 * @returns {EffectfulCallable<F>} Permission-first callable preserving the supported signature.
 */
export function requireAllowEffects(callable) {
  return /** @type {EffectfulCallable<F>} */ (
    function allowEffectsAdapter(permission, ...args) {
      void permission;
      return /** @type {ReturnType<F>} */ (
        Reflect.apply(callable, this, args)
      );
    }
  );
}

/**
 * Resolve a selected property descriptor without invoking dynamic getters.
 * @param {object} target Raw source object.
 * @param {string} key Selected property name.
 * @param {string} path Full classification path for diagnostics.
 * @returns {PropertyDescriptor} Data descriptor for the selected property.
 */
function getSelectedDataDescriptor(target, key, path) {
  let owner = target;
  while (owner !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`Accessor classification is unsupported: ${path}`);
      }
      return descriptor;
    }
    owner = Object.getPrototypeOf(owner);
  }
  throw new TypeError(`Unknown classified property: ${path}`);
}

/**
 * Build a null-prototype object that contains only selected methods.
 * @param {object} target Raw source object.
 * @param {object} classification Explicit method classifications.
 * @param {string} prefix Current nested path.
 * @returns {object} Restricted method surface.
 */
function adaptClassifiedObject(target, classification, prefix) {
  if (target === null || typeof target !== 'object') {
    throw new TypeError(`Invalid adapter target at ${prefix || '<root>'}`);
  }
  if (
    classification === null ||
    Array.isArray(classification) ||
    typeof classification !== 'object'
  ) {
    throw new TypeError(`Invalid method classification at ${prefix || '<root>'}`);
  }
  const keys = Reflect.ownKeys(classification);
  if (keys.length === 0) {
    throw new TypeError(`Empty method classification at ${prefix || '<root>'}`);
  }

  const exposed = Object.create(null);
  for (const key of keys) {
    if (typeof key !== 'string') {
      throw new TypeError(`Invalid classified property at ${prefix || '<root>'}`);
    }
    const path = prefix ? `${prefix}.${key}` : key;
    const descriptor = getSelectedDataDescriptor(target, key, path);
    const rawValue = descriptor.value;
    const classificationValue = Reflect.get(classification, key);

    if (
      classificationValue === 'effect' ||
      classificationValue === 'query'
    ) {
      if (typeof rawValue !== 'function') {
        throw new TypeError(`Classified method is not callable: ${path}`);
      }
      const boundMethod = rawValue.bind(target);
      exposed[key] =
        classificationValue === 'effect'
          ? requireAllowEffects(boundMethod)
          : boundMethod;
      continue;
    }

    if (
      classificationValue !== null &&
      typeof classificationValue === 'object' &&
      !Array.isArray(classificationValue)
    ) {
      if (rawValue === null || typeof rawValue !== 'object') {
        throw new TypeError(`Classified nested path is not an object: ${path}`);
      }
      exposed[key] = adaptClassifiedObject(rawValue, classificationValue, path);
      continue;
    }

    throw new TypeError(`Invalid method classification at ${path}`);
  }
  return Object.freeze(exposed);
}

/**
 * Adapt an explicitly selected object method surface for injection into core.
 * Only keys present in the classification are exposed. Methods are resolved
 * through data descriptors (including prototypes), bound to their original
 * object, and accessors or selected non-method values are rejected. Callers
 * must classify nested objects explicitly; no recursive discovery occurs.
 *
 * @template {object} T
 * @template {import('../../types/effect-adapters').AllowEffectsClassification<T>} C
 * @param {T} target Raw SDK or environment object.
 * @param {C} classification Explicit selected method classifications.
 * @returns {import('../../types/effect-adapters').AdaptedAllowEffectsBag<T, C>} Restricted method surface.
 */
export function adaptAllowEffectsBag(target, classification) {
  return /** @type {import('../../types/effect-adapters').AdaptedAllowEffectsBag<T, C>} */ (
    adaptClassifiedObject(target, classification, '')
  );
}
