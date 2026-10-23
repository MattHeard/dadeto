const HIDDEN_SIZE = 16,
  SEQUENCE_LENGTH = 10;

const isFiniteArray = (values, length) =>
  Array.isArray(values) &&
  values.length === length &&
  values.every(Number.isFinite);

/**
 * Validate the input sequence and pinned tensors at the local boundary.
 * @param {unknown} input Candidate scalar sequence.
 * @param {unknown} fixture Candidate pinned tensor fixture.
 */
export function validateAlgZooM16x10ActivationTraceInput(input, fixture) {
  if (!isFiniteArray(input, SEQUENCE_LENGTH)) {
    throw new TypeError('A finite ten-value input sequence is required.');
  }
  const inputWeights = fixture?.parameters?.inputToHidden?.values;
  const recurrentWeights = fixture?.parameters?.recurrent?.values;
  if (
    !isFiniteArray(inputWeights, HIDDEN_SIZE) ||
    !isFiniteArray(recurrentWeights, HIDDEN_SIZE * HIDDEN_SIZE)
  ) {
    throw new TypeError('Pinned input and recurrent tensors are required.');
  }
}

/**
 * Validate hidden-neuron and recurrent time-step indexes.
 * @param {unknown} neuronIndex Candidate hidden-neuron index.
 * @param {unknown} timeStep Candidate recurrent time step.
 */
export function validateAlgZooM16x10ActivationIndices(neuronIndex, timeStep) {
  if (
    !Number.isInteger(neuronIndex) ||
    neuronIndex < 0 ||
    neuronIndex >= HIDDEN_SIZE
  ) {
    throw new RangeError('Neuron index must be between 0 and 15.');
  }
  if (
    !Number.isInteger(timeStep) ||
    timeStep < 0 ||
    timeStep >= SEQUENCE_LENGTH
  ) {
    throw new RangeError('Time step must be between 0 and 9.');
  }
}
