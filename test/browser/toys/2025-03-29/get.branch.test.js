import { get } from '../../../../src/core/browser/toys/2025-03-29/get.js';

describe('get toy error handling', () => {
  const createEnv = getData => ({
    get(name) {
      if (name === 'getData') {
        return getData;
      }
      return undefined;
    },
  });

  test('returns stringify error message when the retrieved value is circular', () => {
    const circular = {};
    circular.self = circular;
    const getData = () => ({ nested: circular });
    const env = createEnv(getData);

    const result = get('nested', env);
    expect(result).toMatch(/Error stringifying final value at path "nested":/);
  });

  test('reports getData throwing an Error when the dependency fails', () => {
    const getData = () => {
      throw new Error('oomph');
    };
    const env = createEnv(getData);

    const result = get('page', env);
    expect(result).toContain(
      'Error during data retrieval or path traversal for "page": oomph'
    );
  });

  test('formats stringified errors when JSON.stringify throws a string', () => {
    const env = createEnv(() => ({
      nested: {
        toJSON: () => {
          throw 'boom';
        },
      },
    }));

    const result = get('nested', env);
    expect(result).toContain('boom');
  });

  test('reports JSON.stringify errors when an Error is thrown', () => {
    const env = createEnv(() => ({
      nested: {
        toJSON: () => {
          throw new Error('boom error');
        },
      },
    }));

    const result = get('nested', env);
    expect(result).toContain('boom error');
  });

  test('reports stringify failures with non-string throws as unknown errors', () => {
    const env = createEnv(() => ({
      nested: {
        toJSON: () => {
          throw 99;
        },
      },
    }));

    const result = get('nested', env);
    expect(result).toContain('unknown error');
  });

  test('describes string rejections from getData', () => {
    const env = createEnv(() => {
      throw 'boom';
    });

    const result = get('page', env);
    expect(result).toContain('boom');
  });

  test('reports unknown error when getData throws a primitive', () => {
    const env = createEnv(() => {
      throw 42;
    });

    const result = get('page', env);
    expect(result).toContain('unknown error');
  });
});
