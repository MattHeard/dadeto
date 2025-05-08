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
    const env = {
      get: (key) => {
        if (key === 'getData') {return () => { throw new Error('fail'); };}
        if (key === 'setData') {return jest.fn();}
      }
    };
    const result = setOutput('{"foo": "bar"}', env);
    expect(result).toMatch(/Error updating output data/);
  });

  it('merges output data and calls setData', () => {
    const initial = { output: { a: 1 } };
    const setData = jest.fn();
    const env = {
      get: (key) => {
        if (key === 'getData') {return () => initial;}
        if (key === 'setData') {return setData;}
      }
    };
    const input = '{"b":2}';
    const result = setOutput(input, env);
    expect(result).toMatch(/Success: Output data deep merged/);
    expect(setData).toHaveBeenCalled();
    // Ensure output merged
    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toMatchObject({ a: 1, b: 2 });
  });
});
