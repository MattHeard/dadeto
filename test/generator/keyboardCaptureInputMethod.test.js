import { execFileSync } from 'child_process';
import { describe, expect, it } from '@jest/globals';

describe('keyboard capture input method', () => {
  it('includes the keyboard-capture option in the generator source', () => {
    const generatorSource = execFileSync(
      'git',
      ['show', 'HEAD:src/core/build/generator.js'],
      { encoding: 'utf8' }
    );

    expect(generatorSource).toContain("'keyboard-capture',");
  });
});
