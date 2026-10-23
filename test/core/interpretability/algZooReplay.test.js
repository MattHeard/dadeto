import { readFileSync } from 'node:fs';
import {
  calculateAlgZooM16x10Activation,
  calculateAlgZooM16x10ActivationTrace,
} from '../../../src/core/interpretability/algZooReplay.js';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../fixtures/interpretability/alg-zoo-m16-10.json',
      import.meta.url
    ),
    'utf8'
  )
);
const input = [0.11, -0.23, 0.71, 0.18, 0.44, -0.52, 0.92, 0.31, 0.63, -0.07];

describe('pinned AlgZoo M16,10 activation replay', () => {
  it('pins the official source, checkpoint, and tensor dimensions', () => {
    expect(fixture.source.revision).toBe(
      '4433f505a90e85a37d35d34f80f6cccf4a37cef4'
    );
    expect(fixture.source.checkpointSha256).toBe(
      '498bd9a87c469e18e824a78e55c22843c7595776f1bfc2dfe07c36e5616218bb'
    );
    expect(fixture.source.license).toBe('MIT-0');
    expect(fixture.model).toMatchObject({
      id: 'arc-algzoo/m16-10-second-argmax',
      architecture: 'DistRNN',
      activation: 'relu',
      hiddenSize: 16,
      sequenceLength: 10,
      outputSize: 10,
      bias: false,
    });
  });

  it('records the same layer, neuron, time step, and activation on replay', () => {
    const first = calculateAlgZooM16x10Activation(input, fixture, 0, 9);
    const second = calculateAlgZooM16x10Activation([...input], fixture, 0, 9);

    expect(first).toBe(second);
    expect(first).toBe(2.1564955711364746);
    expect(input).toEqual([
      0.11, -0.23, 0.71, 0.18, 0.44, -0.52, 0.92, 0.31, 0.63, -0.07,
    ]);
  });

  it('exposes a deterministic time-major trace matching every scalar replay', () => {
    const trace = calculateAlgZooM16x10ActivationTrace(input, fixture);

    expect(trace).toHaveLength(10);
    expect(trace.every(step => step.length === 16)).toBe(true);
    expect(calculateAlgZooM16x10ActivationTrace(input, fixture)).toEqual(trace);
    for (let timeStep = 0; timeStep < 10; timeStep += 1) {
      for (let neuronIndex = 0; neuronIndex < 16; neuronIndex += 1) {
        expect(
          calculateAlgZooM16x10Activation(input, fixture, neuronIndex, timeStep)
        ).toBe(trace[timeStep][neuronIndex]);
      }
    }
  });
});
