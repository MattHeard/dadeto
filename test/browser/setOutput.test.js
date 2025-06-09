import { describe, it, expect, jest } from '@jest/globals';
import { setOutput } from '../../src/browser/setOutput.js';

describe('setOutput', () => {
  it('returns an error for invalid JSON', () => {
    const result = setOutput('{invalid json}', {});
    expect(result).toMatch(/Error: Invalid JSON input/);
  });

  it('returns an error for non-object input', () => {
    const result = setOutput('42', {});
    expect(result).toMatch(/Error: Input JSON must be a plain object/);
  });

  it('returns an error if merging throws', () => {
    // env.get('getData') throws
    const env = new Map([
      [
        'getData',
        () => {
          throw new Error('fail');
        },
      ],
      ['setData', jest.fn()],
    ]);
    const result = setOutput('{"foo": "bar"}', env);
    expect(result).toMatch(/Error updating output data/);
  });

  it('resets newData.output if it is not an object', () => {
    const initial = { output: [1, 2] };
    const setData = jest.fn();
    const env = new Map([
      ['getData', () => initial],
      ['setData', setData],
    ]);
    const input = '{"b":2}';
    const result = setOutput(input, env);
    expect(result).toMatch(/Success: Output data deep merged/);
    expect(setData).toHaveBeenCalled();
    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toStrictEqual({ b: 2 });
  });

  it('handles null existing output', () => {
    const initial = { output: null };
    const setData = jest.fn();
    const env = new Map([
      ['getData', () => initial],
      ['setData', setData],
    ]);
    const input = '{"b":2}';
    const result = setOutput(input, env);
    expect(result).toMatch(/Success: Output data deep merged/);
    expect(setData).toHaveBeenCalled();
    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toMatchObject({ b: 2 });
  });

  it('merges output data and calls setData', () => {
    const initial = { output: { a: 1 } };
    const setData = jest.fn();
    const env = new Map([
      ['getData', () => initial],
      ['setData', setData],
    ]);
    const input = '{"b":2}';
    const result = setOutput(input, env);
    expect(result).toMatch(/Success: Output data deep merged/);
    expect(setData).toHaveBeenCalled();
    // Ensure output merged
    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toMatchObject({ a: 1, b: 2 });
  });
});
