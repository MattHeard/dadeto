import { readFileSync } from 'node:fs';
import {
  replayAlgZooM16x10Activation,
  replayAlgZooM16x10ActivationTrace,
} from '../../src/local/algZooReplay.js';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/interpretability/alg-zoo-m16-10.json',
      import.meta.url
    ),
    'utf8'
  )
);
const input = [0.11, -0.23, 0.71, 0.18, 0.44, -0.52, 0.92, 0.31, 0.63, -0.07];

describe('validated pinned AlgZoo replay boundary', () => {
  it('rejects invalid sequences and pinned tensor shapes or values', () => {
    expect(() => replayAlgZooM16x10ActivationTrace('invalid', fixture)).toThrow(
      TypeError
    );
    expect(() =>
      replayAlgZooM16x10ActivationTrace(input.slice(1), fixture)
    ).toThrow(TypeError);
    expect(() =>
      replayAlgZooM16x10ActivationTrace(
        [...input.slice(0, 9), Number.NaN],
        fixture
      )
    ).toThrow(TypeError);
    expect(() =>
      replayAlgZooM16x10ActivationTrace(input, { parameters: {} })
    ).toThrow(TypeError);
    expect(() =>
      replayAlgZooM16x10ActivationTrace(input, {
        parameters: {
          ...fixture.parameters,
          inputToHidden: {
            values: fixture.parameters.inputToHidden.values.slice(1),
          },
        },
      })
    ).toThrow(TypeError);
    expect(() =>
      replayAlgZooM16x10ActivationTrace(input, {
        parameters: {
          ...fixture.parameters,
          inputToHidden: {
            values: [
              ...fixture.parameters.inputToHidden.values.slice(0, 15),
              Infinity,
            ],
          },
        },
      })
    ).toThrow(TypeError);
    expect(() =>
      replayAlgZooM16x10ActivationTrace(input, {
        parameters: {
          ...fixture.parameters,
          recurrent: { values: fixture.parameters.recurrent.values.slice(1) },
        },
      })
    ).toThrow(TypeError);
    expect(() =>
      replayAlgZooM16x10ActivationTrace(input, {
        parameters: {
          ...fixture.parameters,
          recurrent: {
            values: [
              ...fixture.parameters.recurrent.values.slice(0, 255),
              Infinity,
            ],
          },
        },
      })
    ).toThrow(TypeError);
    expect(() =>
      replayAlgZooM16x10ActivationTrace(input, {
        parameters: {
          ...fixture.parameters,
          inputToHidden: { values: 'invalid' },
        },
      })
    ).toThrow(TypeError);
  });

  it('rejects invalid scalar replay indices', () => {
    expect(() => replayAlgZooM16x10Activation(input, fixture, -1, 0)).toThrow(
      RangeError
    );
    expect(() => replayAlgZooM16x10Activation(input, fixture, 16, 0)).toThrow(
      RangeError
    );
    expect(() => replayAlgZooM16x10Activation(input, fixture, 0, 10)).toThrow(
      RangeError
    );
    expect(() => replayAlgZooM16x10Activation(input, fixture, 0, 0.5)).toThrow(
      RangeError
    );
  });
});
