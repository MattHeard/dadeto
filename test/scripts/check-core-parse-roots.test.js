import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { classifyFunctionsFromSource } from '../../classify-functions.js';
import {
  createCheckCoreParseHandle,
  createCheckParseBoundaryHandle,
  createCheckParseNotValidateHandle,
} from '../../src/core/scripts/check-core-parse.js';

const parser = 'export function parseValue(value) { return Number(value); }';
const validator =
  'export function validateValue(value) { if (typeof value !== "number") { throw new Error("number required"); } return value; }';
const domain =
  'export function canMove(state) { return state.energy > 0 && state.turn === "player"; }';
let rootDir;

beforeEach(() => {
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-parse-roots-'));
  fs.mkdirSync(path.join(rootDir, 'src/core'), { recursive: true });
});
afterEach(() => fs.rmSync(rootDir, { recursive: true, force: true }));

/**
 * Write one source fixture into the temporary repository.
 * @param {string} file Repository-relative path.
 * @param {string} source Fixture source.
 */
function put(file, source) {
  const target = path.join(rootDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

/**
 * Inject actual platform operations and the real classifier.
 * @param {object} [extra] Dependency overrides.
 * @returns {object} Gate dependencies.
 */
function options(extra = {}) {
  return {
    rootDir,
    fsModule: fs,
    pathModule: path,
    classifySource: classifyFunctionsFromSource,
    stdout: { log: jest.fn(), error: jest.fn() },
    ...extra,
  };
}

test.each([
  'domain.js',
  'index.js',
  'main.js',
  'browser/domain.js',
  'cloud/domain.js',
  'local/domain.js',
  'scripts/domain.js',
  'build/domain.js',
])('trusted core rejects parsing under %s', name => {
  const file = `src/logic/core/${name}`;
  put(file, parser);
  expect(createCheckCoreParseHandle(options())()).toEqual({
    exitCode: 1,
    violations: [{ filePath: file, name: 'parseValue' }],
  });
});

test.each(['domain.js', 'index.js', 'browser/domain.js'])(
  'boundary permits parsers but rejects validator-only helpers under %s',
  name => {
    const file = `src/logic/boundary/${name}`;
    put(file, parser);
    expect(createCheckCoreParseHandle(options())()).toEqual({
      exitCode: 0,
      violations: [],
    });
    put(file, validator);
    expect(createCheckParseNotValidateHandle(options())()).toEqual({
      exitCode: 1,
      violations: [{ filePath: file, name: 'validateValue' }],
    });
    expect(createCheckParseBoundaryHandle(options())()).toEqual({
      exitCode: 0,
      violations: [],
    });
  }
);

test('domain decisions remain valid in both namespaces', () => {
  put('src/logic/core/domain.js', domain);
  put('src/logic/boundary/domain.js', domain);
  expect(createCheckCoreParseHandle(options())()).toEqual({
    exitCode: 0,
    violations: [],
  });
});

test('legacy labels still reject comparison and construction heuristics', () => {
  put('src/core/decision.js', domain);
  put(
    'src/core/construct.js',
    'export function construct(value) { return {value}; }'
  );
  const result = createCheckCoreParseHandle(options())();
  expect(result.exitCode).toBe(1);
  expect(result.violations).toEqual([
    { filePath: 'src/core/decision.js', name: 'canMove' },
    { filePath: 'src/core/construct.js', name: 'construct' },
  ]);
});

test.each(['validator', 'parser'])(
  'destination preserves the injected legacy %s contract without signal metadata',
  label => {
    put('src/logic/core/domain.js', domain);
    const classifySource = () => [{ name: 'injected', labels: [label] }];
    expect(createCheckCoreParseHandle(options({ classifySource }))()).toEqual({
      exitCode: 1,
      violations: [{ filePath: 'src/logic/core/domain.js', name: 'injected' }],
    });
  }
);

test('signal kinds only count as parsing when attached to the parser label', () => {
  put('src/logic/core/domain.js', domain);
  const classifySource = () => [
    {
      name: 'injected',
      labels: ['validator'],
      signals: [{ label: 'validator', kind: 'schema_parse' }],
    },
  ];
  expect(createCheckParseBoundaryHandle(options({ classifySource }))()).toEqual(
    { exitCode: 0, violations: [] }
  );
});

test.each([
  'return { score: state.energy * 2 };',
  'return [state.energy];',
  'return state.energy > 0 ? state.energy : 0;',
  'return state.values.map(value => value * 2);',
  'return new Score(state.energy);',
])('trusted computation permits domain construction: %s', body => {
  put('src/logic/core/domain.js', `export function compute(state) { ${body} }`);
  expect(createCheckCoreParseHandle(options())()).toEqual({
    exitCode: 0,
    violations: [],
  });
});

test.each([
  'return typeof value === "number";',
  'return value.count > 0 && typeof value.name === "string";',
  'if (typeof value !== "number") throw new Error("number required"); return {count: value};',
])('domain comparisons cannot hide an argument type guard: %s', body => {
  put('src/logic/core/domain.js', `export function check(value) { ${body} }`);
  expect(createCheckParseNotValidateHandle(options())()).toEqual({
    exitCode: 1,
    violations: [{ filePath: 'src/logic/core/domain.js', name: 'check' }],
  });
});

test.each(['JSON.parse(value)', 'Number(value)', 'Date.parse(value)'])(
  'domain construction cannot hide raw parsing: %s',
  expression => {
    put(
      'src/logic/core/domain.js',
      `export function compute(value) { return { result: ${expression} }; }`
    );
    expect(createCheckParseBoundaryHandle(options())()).toEqual({
      exitCode: 1,
      violations: [{ filePath: 'src/logic/core/domain.js', name: 'compute' }],
    });
  }
);

test('boundary object construction may combine guards and typed results', () => {
  put(
    'src/logic/boundary/domain.js',
    'export function parse(value) { if (typeof value !== "number") return {ok: false}; return {ok: true, value}; }'
  );
  expect(createCheckCoreParseHandle(options())()).toEqual({
    exitCode: 0,
    violations: [],
  });
});

test('explicit sourceRoot scans only that root, including an explicit empty root', () => {
  put('src/logic/core/domain.js', parser);
  put('other/domain.js', parser);
  expect(
    createCheckCoreParseHandle(options({ sourceRoot: 'src/core' }))()
  ).toEqual({ exitCode: 0, violations: [] });
  expect(
    createCheckParseBoundaryHandle(options({ sourceRoot: 'other' }))()
  ).toEqual({
    exitCode: 1,
    violations: [{ filePath: 'other/domain.js', name: 'parseValue' }],
  });
  expect(
    createCheckParseBoundaryHandle(options({ sourceRoot: '' }))().violations
  ).toHaveLength(2);
});

test('missing future roots are allowed, missing required or explicit roots fail', () => {
  expect(createCheckCoreParseHandle(options())()).toEqual({
    exitCode: 0,
    violations: [],
  });
  expect(() =>
    createCheckCoreParseHandle(options({ sourceRoot: 'src/logic/core' }))()
  ).toThrow();
  fs.rmdirSync(path.join(rootDir, 'src/core'));
  expect(() => createCheckCoreParseHandle(options())()).toThrow();
});

test.each(['EACCES', 'EIO', 'ENOTDIR'])(
  'future-root %s failures propagate',
  code => {
    const failure = Object.assign(new Error(code), { code });
    const fsModule = {
      ...fs,
      readdirSync: (dir, config) => {
        if (dir === path.join(rootDir, 'src/logic/core')) throw failure;
        return fs.readdirSync(dir, config);
      },
    };
    expect(() => createCheckCoreParseHandle(options({ fsModule }))()).toThrow(
      failure
    );
  }
);

test('ENOENT below an existing future root propagates', () => {
  put('src/logic/core/nested/domain.js', domain);
  const failure = Object.assign(new Error('nested disappeared'), {
    code: 'ENOENT',
  });
  const fsModule = {
    ...fs,
    readdirSync: (dir, config) => {
      if (dir === path.join(rootDir, 'src/logic/core/nested')) throw failure;
      return fs.readdirSync(dir, config);
    },
  };
  expect(() => createCheckCoreParseHandle(options({ fsModule }))()).toThrow(
    failure
  );
});

test('future-root source read failures propagate', () => {
  put('src/logic/core/domain.js', domain);
  const failure = new Error('source unreadable');
  const fsModule = {
    ...fs,
    readFileSync: (file, encoding) => {
      if (file.endsWith('/domain.js')) throw failure;
      return fs.readFileSync(file, encoding);
    },
  };
  expect(() => createCheckCoreParseHandle(options({ fsModule }))()).toThrow(
    failure
  );
});

test.each([null, undefined, 'ENOENT', false, {}, { code: 'EIO' }])(
  'unexpected thrown filesystem value propagates unchanged: %j',
  failure => {
    const fsModule = {
      ...fs,
      readdirSync: (dir, config) => {
        if (dir === path.join(rootDir, 'src/logic/core')) throw failure;
        return fs.readdirSync(dir, config);
      },
    };
    let caught = Symbol('not thrown');
    try {
      createCheckCoreParseHandle(options({ fsModule }))();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
  }
);
