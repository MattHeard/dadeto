import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

describe('keyboard capture input method', () => {
  it('includes the keyboard-capture option in the generator source', () => {
    const generatorSource = fs.readFileSync(
      path.join(process.cwd(), 'src/build/generator.js'),
      'utf8'
    );

    expect(generatorSource).toContain("'keyboard-capture',");
  });
});
