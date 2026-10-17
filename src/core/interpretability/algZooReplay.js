const HIDDEN_SIZE = 16;
/**
 * Compute one pinned AlgZoo M16,10 recurrent hidden-state activation.
 * The accumulator rounds to float32 after each multiply and addition, matching
 * checkpoint tensor precision. The caller supplies the verified fixture and a
 * ten-value input sequence; archive parsing and boundary validation stay out
 * of core.
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
  const weights = fixture.parameters;
  let state = Array(HIDDEN_SIZE).fill(0);
  const hiddenStateTrace = [];

  for (const value of input) {
    const nextState = [];
    for (let neuron = 0; neuron < HIDDEN_SIZE; neuron += 1) {
      let sum = Math.fround(value * weights.inputToHidden.values[neuron]);
      for (let previous = 0; previous < HIDDEN_SIZE; previous += 1) {
        const product = Math.fround(
          state[previous] *
            weights.recurrent.values[neuron * HIDDEN_SIZE + previous]
        );
        sum = Math.fround(sum + product);
      }
      const activation = Math.max(0, sum);
      nextState.push(activation);
    }
    state = nextState;
    hiddenStateTrace.push(state);
  }

  return hiddenStateTrace[timeStep][neuronIndex];
}
