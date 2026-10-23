import { calculateAlgZooM16x10ActivationTrace } from '../core/interpretability/algZooReplay.js';
import {
  validateAlgZooM16x10ActivationIndices,
  validateAlgZooM16x10ActivationTraceInput,
} from './algZooReplayValidation.js';

/**
 * Validate and replay the full pinned M16,10 hidden-state trace.
 * @param {unknown} input Candidate scalar sequence.
 * @param {unknown} fixture Candidate pinned tensor fixture.
 * @returns {number[][]} Time-major activations, with ten rows of sixteen units.
 */
export function replayAlgZooM16x10ActivationTrace(input, fixture) {
  validateAlgZooM16x10ActivationTraceInput(input, fixture);
  return calculateAlgZooM16x10ActivationTrace(input, fixture);
}

/**
 * Validate and replay one pinned hidden-state activation.
 * @param {unknown} input Candidate scalar sequence.
 * @param {unknown} fixture Candidate pinned tensor fixture.
 * @param {unknown} neuronIndex Candidate hidden-neuron index.
 * @param {unknown} timeStep Candidate recurrent time step.
 * @returns {number} Captured ReLU hidden-state activation.
 */
export function replayAlgZooM16x10Activation(
  input,
  fixture,
  neuronIndex,
  timeStep
) {
  validateAlgZooM16x10ActivationIndices(neuronIndex, timeStep);
  return replayAlgZooM16x10ActivationTrace(input, fixture)[timeStep][
    neuronIndex
  ];
}
