import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function extractFunction(name) {
  const code = readFileSync(filePath, 'utf8');
  const start = code.indexOf(`function ${name}`);
  if (start === -1) {
    throw new Error(`${name} not found`);
  }
  const open = code.indexOf('{', start);
  let depth = 1;
  let i = open + 1;
  while (depth > 0 && i < code.length) {
    const ch = code[i];
    if (ch === '{') {depth++;}
    else if (ch === '}') {depth--;}
    i++;
  }
  const funcCode = code.slice(start, i);
  return new Function(`${funcCode}; return ${name};`)();
}

describe('defaultKeyExtraClasses using brace parser', () => {
  it('sets keyExtraClasses to empty string when undefined', () => {
    const defaultKeyExtraClasses = extractFunction('defaultKeyExtraClasses');
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
    expect(args.keyExtraClasses).toBe('');
  });
});
