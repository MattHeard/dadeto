import { createAsyncDomainHandler } from '../../../src/core/cloud/handler-utils.js';

describe('createAsyncDomainHandler', () => {
  test('maps arguments before executing the async handler', async () => {
    const execute = async params => ({ ok: true, params });
    const mapParams = (a, b) => ({ a, b, sum: a + b });
    const handler = createAsyncDomainHandler({ execute, mapParams });

    await expect(handler(2, 3)).resolves.toEqual({
      ok: true,
      params: { a: 2, b: 3, sum: 5 },
    });
  });

  test('requires execute to be a function', () => {
    expect(() =>
      createAsyncDomainHandler({
        execute: null,
        mapParams: (...args) => ({ args }),
      })
    ).toThrow(new TypeError('execute must be a function'));
  });

  test('requires mapParams to be a function', () => {
    expect(() =>
      createAsyncDomainHandler({
        execute: () => undefined,
        mapParams: null,
      })
    ).toThrow(new TypeError('mapParams must be a function'));
  });
});
