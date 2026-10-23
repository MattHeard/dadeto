import { createAlgZooNormalSequence } from '../core/interpretability/algZooPilotHarness/index.js';
import { replayAlgZooM16x10ActivationTrace } from './algZooReplay.js';

const MODEL_ID = 'arc-algzoo/m16-10-second-argmax';
const SOURCE_REVISION = '4433f505a90e85a37d35d34f80f6cccf4a37cef4';
const CHECKPOINT_SHA256 =
  '498bd9a87c469e18e824a78e55c22843c7595776f1bfc2dfe07c36e5616218bb';

/**
 * Create deterministic replay-only JSON for one seeded M16,10 sequence.
 * @param {number} seed 32-bit input seed.
 * @param {Record<string, any>} fixture Pinned M16,10 fixture.
 * @returns {Record<string, any>} Replay identity, input, and time-major activations.
 */
export function createAlgZooActivationTraceReport(seed, fixture) {
  if (
    fixture?.source?.revision !== SOURCE_REVISION ||
    fixture?.source?.checkpointSha256 !== CHECKPOINT_SHA256 ||
    fixture?.model?.id !== MODEL_ID ||
    fixture?.model?.architecture !== 'DistRNN' ||
    fixture?.model?.activation !== 'relu' ||
    fixture?.model?.hiddenSize !== 16 ||
    fixture?.model?.sequenceLength !== 10 ||
    fixture?.model?.outputSize !== 10 ||
    fixture?.model?.bias !== false
  ) {
    throw new TypeError('The pinned AlgZoo M16,10 fixture is required.');
  }
  const input = createAlgZooNormalSequence(seed);
  return {
    schemaVersion: 1,
    evidenceType: 'deterministic-replay-only',
    seed,
    model: {
      id: MODEL_ID,
      sourceRevision: SOURCE_REVISION,
      checkpointSha256: CHECKPOINT_SHA256,
    },
    input,
    activationTraceByTimeStep: replayAlgZooM16x10ActivationTrace(
      input,
      fixture
    ),
  };
}
