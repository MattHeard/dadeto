import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Write a temporary JS file and classify it with the CLI.
 * @param {string} source JavaScript source to classify.
 * @returns {{ filePath: string, output: { filePath: string, functions: Array<{ name: string, labels: string[] }> } }} Classification result.
 */
function runClassifier(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classify-functions-'));
  const filePath = path.join(dir, 'sample.js');
  fs.writeFileSync(filePath, source);

  return {
    filePath,
    output: JSON.parse(
      execFileSync(
        process.execPath,
        [path.resolve('classify-functions.js'), filePath],
        {
          encoding: 'utf8',
        }
      )
    ),
  };
}

describe('classify-functions CLI', () => {
  it('classifies parser and validator functions and keeps nested functions separate', () => {
    const { output } = runClassifier(`
export function parseUser(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Expected object');
  }

  return {
    id: String(input.id),
    age: Number(input.age)
  };
}

export function calculateScore(user) {
  return user.age * 2;
}

export function isAdult(user) {
  return user.age >= 18;
}

export function parseCount(value) {
  return Number(value);
}

export function assertPresent(value) {
  if (value == null) {
    throw new Error('Expected value');
  }
}

export function parseProfile(input) {
  return input.map(item => parseItem(item));
}

export function parseKind(raw) {
  return raw.status === 'published' ? PUBLISHED : DRAFT;
}

export function parseUserId(raw) {
  return new UserId(raw.id);
}

export function hasId(object) {
  return 'id' in object;
}

export function hasOwnId(object) {
  return Object.prototype.hasOwnProperty.call(object, 'id');
}

export function isUnset(value) {
  return null === value || undefined !== value;
}

function outer(value) {
  function inner(raw) {
    return Number(raw);
  }

  return value;
}
`);

    expect(output.filePath).toEqual(expect.stringContaining('sample.js'));
    expect(output.functions.map(fn => fn.name)).toEqual([
      'parseUser',
      'calculateScore',
      'isAdult',
      'parseCount',
      'assertPresent',
      'parseProfile',
      'parseKind',
      'parseUserId',
      'hasId',
      'hasOwnId',
      'isUnset',
      'outer',
      'inner',
    ]);
    expect(output.functions.find(fn => fn.name === 'parseUser').labels).toEqual(
      ['parser', 'validator']
    );
    expect(
      output.functions.find(fn => fn.name === 'calculateScore').labels
    ).toEqual([]);
    expect(output.functions.find(fn => fn.name === 'isAdult').labels).toEqual([
      'validator',
    ]);
    expect(
      output.functions.find(fn => fn.name === 'parseCount').labels
    ).toEqual(['parser']);
    expect(
      output.functions.find(fn => fn.name === 'assertPresent').labels
    ).toEqual(['validator']);
    expect(
      output.functions.find(fn => fn.name === 'parseProfile').labels
    ).toEqual(['parser']);
    expect(output.functions.find(fn => fn.name === 'parseKind').labels).toEqual(
      [['parser']][0]
    );
    expect(
      output.functions.find(fn => fn.name === 'parseUserId').labels
    ).toEqual(['parser']);
    expect(output.functions.find(fn => fn.name === 'hasId').labels).toEqual([
      'validator',
    ]);
    expect(output.functions.find(fn => fn.name === 'hasOwnId').labels).toEqual([
      'validator',
    ]);
    expect(output.functions.find(fn => fn.name === 'isUnset').labels).toEqual([
      'validator',
    ]);
    expect(output.functions.find(fn => fn.name === 'outer').labels).toEqual([]);
    expect(output.functions.find(fn => fn.name === 'inner').labels).toEqual([
      'parser',
    ]);
  });

  it('prints a json file read error to stderr and exits non-zero', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [path.resolve('classify-functions.js'), '/no/such/file.js'],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      )
    ).toThrow(/Could not read file/);
  });

  it('prints a parse error for invalid syntax', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classify-functions-'));
    const filePath = path.join(dir, 'broken.js');
    fs.writeFileSync(filePath, 'export function broken( {');

    expect(() =>
      execFileSync(
        process.execPath,
        [path.resolve('classify-functions.js'), filePath],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      )
    ).toThrow(/parse_error/);
  });
});
