const HIDDEN_SIZE = 16;

/**
 * Compute all recurrent hidden-state activations for the pinned M16,10 model.
 * @param {number[]} input Ten scalar sequence values.
 * @param {{parameters: {inputToHidden: {values: number[]}, recurrent: {values: number[]}}}} fixture Verified pinned tensor values.
 * @returns {number[][]} Time-major activations, with ten rows of sixteen units.
 */
export function calculateAlgZooM16x10ActivationTrace(input, fixture) {
  const inputWeights = fixture.parameters.inputToHidden.values;
  const recurrentWeights = fixture.parameters.recurrent.values;
  let state = Array(HIDDEN_SIZE).fill(0);
  const trace = [];
  for (const value of input) {
    const nextState = [];
    for (let neuron = 0; neuron < HIDDEN_SIZE; neuron += 1) {
      let sum = Math.fround(value * inputWeights[neuron]);
      for (let previous = 0; previous < HIDDEN_SIZE; previous += 1) {
        const product = Math.fround(
          state[previous] * recurrentWeights[neuron * HIDDEN_SIZE + previous]
        );
        sum = Math.fround(sum + product);
      }
      nextState.push(Math.max(0, sum));
    }
    state = nextState;
    trace.push(state);
  }
  return trace;
}

/**
 * Compute one pinned AlgZoo M16,10 recurrent hidden-state activation.
 * The accumulator rounds to float32 after each multiply and addition, matching
 * checkpoint tensor precision.
 * @param {number[]} input Ten scalar sequence values.
 * @param {{parameters: {inputToHidden: {values: number[]}, recurrent: {values: number[]}}}} fixture Verified pinned tensor values.
 * @param {number} neuronIndex Hidden-neuron index to capture.
 * @param {number} timeStep Recurrent time step to capture.
 * @returns {number} Captured ReLU hidden-state activation.
 */
export function calculateAlgZooM16x10Activation(
  input,
  fixture,
  neuronIndex,
  timeStep
) {
  return calculateAlgZooM16x10ActivationTrace(input, fixture)[timeStep][
    neuronIndex
  ];
}
