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

  it('recognizes additional parser and validator signals from the review', () => {
    const { output } = runClassifier(`
function extra(raw, object, value) {
  if ('id' in object) {
    return raw.status === 'published' ? PUBLISHED : DRAFT;
  }

  if (null === value || Object.prototype.hasOwnProperty.call(object, 'name')) {
    return input.map(item => parseItem(item));
  }

  return new UserId(raw.id);
}
`);

    const extra = output.functions[0];
    expect(extra.labels).toEqual(['parser', 'validator']);
    expect(extra.signals.map(signal => signal.kind)).toEqual([
      'property_presence_check',
      'maps_external_value_to_internal_value',
    ]);
  });
});
