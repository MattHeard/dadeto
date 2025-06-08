import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

const sourcePath = path.join(process.cwd(), 'src/generator/html.js');

describe('html constants source definitions', () => {
  test('TAG_OPEN constant is defined as <', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/export const TAG_OPEN = '<';/);
  });

  test('DOCTYPE constant is defined correctly', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/export const DOCTYPE = '<!DOCTYPE html>';/);
  });
});
