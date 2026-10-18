import { parseFunctionEndpointRegistry } from '../../src/core/build/function-endpoint-registry.js';

const validRegistry = {
  schemaVersion: 1,
  environment: 'prod',
  functions: {
    objectMinuteRentalSearch: 'https://rental-search.example.run.app',
    getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
  },
};

describe('parseFunctionEndpointRegistry', () => {
  it('returns the validated schema and preserves additional public function keys', () => {
    const input = {
      ...validRegistry,
      functions: {
        ...validRegistry.functions,
        publicComments: 'https://comments.example.run.app',
      },
    };

    expect(parseFunctionEndpointRegistry(JSON.stringify(input))).toEqual(input);
  });

  it.each([
    ['', 'Registry GET returned invalid JSON.'],
    ['{', 'Registry GET returned invalid JSON.'],
    ['null', 'Registry JSON must be an object.'],
    ['[]', 'Registry JSON must be an object.'],
    [
      JSON.stringify({ ...validRegistry, apiKey: 'secret' }),
      'unsupported property: apiKey',
    ],
    [
      JSON.stringify({ ...validRegistry, schemaVersion: 2 }),
      'schemaVersion must be 1',
    ],
    [
      JSON.stringify({ ...validRegistry, environment: 'test' }),
      'environment must be prod',
    ],
    [
      JSON.stringify({ ...validRegistry, functions: [] }),
      'functions must be an object',
    ],
    [
      JSON.stringify({
        ...validRegistry,
        functions: { getAuthorUuidV2: validRegistry.functions.getAuthorUuidV2 },
      }),
      'missing the objectMinuteRentalSearch function key',
    ],
    [
      JSON.stringify({
        ...validRegistry,
        functions: { ...validRegistry.functions, ' ': 'https://empty.example' },
      }),
      'function keys must be non-empty',
    ],
    [
      JSON.stringify({
        ...validRegistry,
        functions: { ...validRegistry.functions, badValue: 7 },
      }),
      'function keys must be non-empty',
    ],
    [
      JSON.stringify({
        ...validRegistry,
        functions: { ...validRegistry.functions, badUrl: 'not a URL' },
      }),
      'URL for badUrl is invalid',
    ],
    [
      JSON.stringify({
        ...validRegistry,
        functions: {
          ...validRegistry.functions,
          insecure: 'http://internal.test',
        },
      }),
      'URL for insecure must use HTTPS',
    ],
    [
      JSON.stringify({
        ...validRegistry,
        functions: {
          ...validRegistry.functions,
          credentialed: 'https://user:password@api.example.run.app',
        },
      }),
      'URL for credentialed must use HTTPS',
    ],
  ])(
    'rejects invalid registry JSON with an actionable diagnostic',
    (json, message) => {
      expect(() => parseFunctionEndpointRegistry(json)).toThrow(message);
    }
  );
});
