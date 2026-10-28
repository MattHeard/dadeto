import { jest } from '@jest/globals';
import { createSimulatorRandomness } from '../../../../src/core/local/gcp-simulator/randomness.js';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

const UUID = 'abcdef01-2345-4678-8123-456789abcdef';

test('callback construction is lazy and every UUID operation supplies its lifetime permission', () => {
  const permission = createAllowEffects();
  const generate = jest.fn(() => UUID);
  const randomness = createSimulatorRandomness(permission, generate);
  const random = randomness.createRandomSource();
  expect(generate).not.toHaveBeenCalled();
  expect(randomness.randomUUID()).toBe(UUID);
  expect(random()).toBe(0xabcdef01 / 0xffffffff);
  expect(generate.mock.calls).toEqual([[permission], [permission]]);
});

test.each([
  ['00000000-1234-4000-8000-000000000000', 0],
  ['ffffffff-1234-4000-8000-000000000000', 1],
  ['80000000-1234-4000-8000-000000000000', 0x80000000 / 0xffffffff],
  ['ABCDEF01-1234-4000-8000-000000000000', 0xabcdef01 / 0xffffffff],
])('uses only the canonical UUID first field %s', (uuid, expected) => {
  const permission = createAllowEffects();
  const generate = jest.fn(() => uuid);
  const random = createSimulatorRandomness(
    permission,
    generate
  ).createRandomSource();
  expect(random()).toBe(expected);
  expect(generate.mock.calls).toEqual([[permission]]);
});

test('each random sample obtains a fresh UUID while factories retain separate permissions', () => {
  const generate = jest
    .fn()
    .mockReturnValueOnce(UUID)
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000000')
    .mockReturnValueOnce('ffffffff-0000-4000-8000-000000000000');
  const a = createAllowEffects();
  const b = createAllowEffects();
  const first = createSimulatorRandomness(a, generate);
  const second = createSimulatorRandomness(b, generate);
  const random = first.createRandomSource();
  expect(second.randomUUID()).toBe(UUID);
  expect(random()).toBe(0);
  expect(random()).toBe(1);
  expect(generate.mock.calls).toEqual([[b], [a], [a]]);
});

test('UUID provider failures propagate from both derived callbacks', () => {
  const failure = new Error('UUID provider unavailable');
  const permission = createAllowEffects();
  const generate = jest.fn(() => {
    throw failure;
  });
  const randomness = createSimulatorRandomness(permission, generate);
  expect(() => randomness.randomUUID()).toThrow(failure);
  expect(() => randomness.createRandomSource()()).toThrow(failure);
  expect(generate.mock.calls).toEqual([[permission], [permission]]);
});
