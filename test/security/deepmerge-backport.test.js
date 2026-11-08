import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { jest } from '@jest/globals';

const require = createRequire(import.meta.url);
const fromJest = createRequire(require.resolve('jest-config/package.json'));
const resolved = fromJest.resolve('deepmerge');
const { default: merge } = await import(pathToFileURL(resolved).href);
const poison = () => JSON.parse('{"__proto__":{"injected":true}}');

/**
 * Assert a plain result cannot inherit the advisory's hidden flag.
 * @param {Record<string, unknown>} value Merged plain object.
 */
function expectClean(value) {
  expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
  expect(value.injected).toBeUndefined();
  expect(Object.hasOwn(value, '__proto__')).toBe(false);
  expect({}.injected).toBeUndefined();
}

test('Jest resolves the explicitly identified local backport', () => {
  expect(resolved).toBe(
    fileURLToPath(new URL('../../vendor/deepmerge/index.cjs', import.meta.url))
  );
  expect(fromJest('deepmerge/package.json')).toMatchObject({
    name: '@dadeto/deepmerge',
    version: '4.3.1-dadeto.1',
    private: true,
  });
});

test.each([
  ['null-prototype target', () => merge(Object.create(null), poison())],
  [
    'null placeholder',
    () => merge({ session: null }, { session: poison() }).session,
  ],
  [
    'undefined placeholder',
    () => merge({ session: undefined }, { session: poison() }).session,
  ],
  [
    'primitive placeholder',
    () => merge({ session: 3 }, { session: poison() }).session,
  ],
  ['own proto in target', () => merge(poison(), {})],
  ['nested target poison', () => merge({ session: poison() }, {}).session],
  ['array element poison', () => merge([], [poison()])[0]],
])('blocks %s without modifying global prototypes', (_name, evaluate) => {
  expectClean(evaluate());
});

test.each(['__proto__', 'constructor', 'prototype'])(
  'rejects %s in both copy loops before evaluating its getter',
  key => {
    const getter = jest.fn(() => {
      throw new Error('forbidden getter reached');
    });
    const object = Object.create(null);
    Object.defineProperty(object, key, { enumerable: true, get: getter });
    expect(merge(object, {})).toEqual({});
    expect(merge(Object.create(null), object)).toEqual({});
    expect(getter).not.toHaveBeenCalled();
  }
);

test('defines own data properties without invoking inherited setters', () => {
  const key = '__dadeto_merge_setter_probe__';
  const setter = jest.fn();
  Object.defineProperty(Object.prototype, key, {
    configurable: true,
    set: setter,
  });
  try {
    const value = merge(Object.create(null), { [key]: 'safe' });
    expect(Object.getOwnPropertyDescriptor(value, key)).toEqual({
      value: 'safe',
      enumerable: true,
      writable: true,
      configurable: true,
    });
    expect(setter).not.toHaveBeenCalled();
  } finally {
    delete Object.prototype[key];
  }
});

test('preserves recursive merges, array concatenation and clone independence', () => {
  const left = { nested: { left: 1 }, list: [{ left: 1 }] };
  const right = { nested: { right: 2 }, list: [{ right: 2 }] };
  const result = merge(left, right);
  expect(result).toEqual({
    nested: { left: 1, right: 2 },
    list: [{ left: 1 }, { right: 2 }],
  });
  expect(result.nested).not.toBe(left.nested);
  expect(result.list[0]).not.toBe(left.list[0]);
  expect(result.list[1]).not.toBe(right.list[0]);
  expect(left).toEqual({ nested: { left: 1 }, list: [{ left: 1 }] });
  expect(right).toEqual({ nested: { right: 2 }, list: [{ right: 2 }] });
});

test('preserves all(), symbols, special values and clone:false', () => {
  const symbol = Symbol('key');
  const date = new Date(0);
  const regexp = /value/;
  const react = { $$typeof: Symbol.for('react.element'), value: 'element' };
  const nested = { value: 1 };
  expect(merge.all([{ a: 1 }, { b: 2 }, { a: 3 }])).toEqual({ a: 3, b: 2 });
  expect(merge.all([])).toEqual({});
  expect(() => merge.all(null)).toThrow('first argument should be an array');
  const result = merge(
    {},
    { [symbol]: nested, date, regexp, react },
    { clone: false }
  );
  expect(result[symbol]).toBe(nested);
  expect(result.date).toBe(date);
  expect(result.regexp).toBe(regexp);
  expect(result.react).toBe(react);
  const hidden = Symbol('hidden');
  const source = Object.defineProperty({}, hidden, { value: 1 });
  expect(merge({}, source)[hidden]).toBeUndefined();
});

test('preserves documented custom array, merge and object policies', () => {
  const arrayMerge = jest.fn((_target, source, options) =>
    source.map(value => options.cloneUnlessOtherwiseSpecified(value, options))
  );
  const result = merge(
    { list: [1], normal: { left: 1 }, custom: { left: 1 } },
    {
      list: [{ right: 2 }],
      normal: { right: 2 },
      custom: { right: 2 },
    },
    {
      arrayMerge,
      customMerge: key =>
        key === 'custom' ? () => 'custom-result' : undefined,
    }
  );
  expect(result).toEqual({
    list: [{ right: 2 }],
    normal: { left: 1, right: 2 },
    custom: 'custom-result',
  });
  expect(arrayMerge).toHaveBeenCalled();
  expect(
    merge({}, { nested: { value: 1 } }, { isMergeableObject: () => false })
  ).toEqual({ nested: { value: 1 } });
  expect(merge([], { value: 1 })).toEqual({ value: 1 });
  expect(merge({}, [1, 2])).toEqual([1, 2]);
});

test('the Playwright image includes the local package before installing dependencies', () => {
  const dockerfile = readFileSync(
    new URL('../../docker/playwright/Dockerfile', import.meta.url),
    'utf8'
  );
  const copy = dockerfile.indexOf('COPY vendor/deepmerge ./vendor/deepmerge');
  const install = dockerfile.indexOf(
    'RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci'
  );
  expect(copy).toBeGreaterThan(-1);
  expect(install).toBeGreaterThan(copy);
});
