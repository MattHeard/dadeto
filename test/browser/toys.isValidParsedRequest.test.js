import { processInputAndSetOutput } from '../../src/browser/toys.js';

describe('processInputAndSetOutput', () => {
  it('minimal test case', () => {
    const elements = {
      inputElement: { value: '' },
      outputSelect: { value: 'text' },
      article: { id: 'test-article' }
    };
    const processingFunction = () => '';
    const env = {
      createEnv: () => ({
        get: () => ({
          getData: () => ({}),
          setData: () => {}
        })
      }),
      dom: {
        removeAllChildren: () => {},
        createElement: () => ({
          style: {},
          setAttribute: () => {}
        }),
        setTextContent: () => {},
        appendChild: () => {}
      }
    };

    processInputAndSetOutput(elements, processingFunction, env);
  });
});
