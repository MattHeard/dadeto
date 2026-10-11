import { jsonCanonicalizer } from '../browser/toys/2026-07-04/jsonCanonicalizer.js';

/**
 * @typedef {{ capabilityId: string, input: string }} CapabilityInvocation
 * Input for invoking one registered capability.
 */

/**
 * @typedef {{ id: string, name: string, description: string, inputType: string, outputType: string }} CapabilityDescription
 * Public description of an allowlisted capability.
 */

/** @typedef {'INVALID_INVOCATION'|'UNKNOWN_CAPABILITY'} CapabilityErrorCode */

/** @typedef {Error & { code: CapabilityErrorCode }} CapabilityInvocationError */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   description: string,
 *   inputType: string,
 *   outputType: string,
 *   invoke: (input: string) => string,
 * }} RegisteredCapability
 */

/** @type {Map<string, RegisteredCapability>} */
const capabilityRegistry = new Map([
  [
    'JSON1',
    Object.freeze({
      id: 'JSON1',
      name: 'JSON Canonicalizer',
      description:
        'Canonicalize valid JSON by recursively sorting object keys while preserving array order.',
      inputType: 'string',
      outputType: 'string',
      invoke: jsonCanonicalizer,
    }),
  ],
]);

/**
 * List the registered capabilities without exposing implementation functions.
 * @returns {Array<CapabilityDescription>} Safe public capability metadata.
 */
export function listCapabilities() {
  return Array.from(capabilityRegistry.values(), capability => ({
    id: capability.id,
    name: capability.name,
    description: capability.description,
    inputType: capability.inputType,
    outputType: capability.outputType,
  }));
}

/**
 * Invoke one explicitly registered capability.
 * @param {CapabilityInvocation} invocation Invocation request.
 * @returns {string} Capability output.
 * @throws {CapabilityInvocationError} For invalid requests and unknown IDs.
 */
export function invokeCapability(invocation) {
  if (
    !invocation ||
    typeof invocation !== 'object' ||
    typeof invocation.capabilityId !== 'string' ||
    typeof invocation.input !== 'string'
  ) {
    const error = /** @type {CapabilityInvocationError} */ (
      new Error(
        'Capability invocation must include a capability ID and string input.'
      )
    );
    error.name = 'CapabilityInvocationError';
    error.code = 'INVALID_INVOCATION';
    throw error;
  }

  const capability = capabilityRegistry.get(invocation.capabilityId);
  if (!capability) {
    const error = /** @type {CapabilityInvocationError} */ (
      new Error('Unknown capability ID.')
    );
    error.name = 'CapabilityInvocationError';
    error.code = 'UNKNOWN_CAPABILITY';
    throw error;
  }

  return capability.invoke(invocation.input);
}
