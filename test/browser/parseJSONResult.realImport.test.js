import { describe, it } from '@jest/globals';
import { processInputAndSetOutput } from '../../src/browser/toys.js';

// This test indirectly covers parseJSONResult by invoking processInputAndSetOutput

describe('processInputAndSetOutput via dynamic import', () => {
  it('captures parsed result from invalid JSON', () => {
    const elements = {
      inputElement: { value: 'x' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setData', () => {}],
    ]);
    const env = {
      createEnv: () => toyEnv,
      fetchFn: () => Promise.resolve({ text: () => Promise.resolve('') }),
      dom: {
        setTextContent: () => {},
        removeAllChildren: () => {},
        appendChild: () => {},
        createElement: () => ({}),
      },
    };
    processInputAndSetOutput(elements, x => x, env);
  });
});
