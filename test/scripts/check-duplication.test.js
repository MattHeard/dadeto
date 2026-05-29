import { jest } from '@jest/globals';
import { runDuplicationGate } from '../../src/scripts/check-duplication.js';

/**
 * Create a tiny writer stub that records writes for assertions.
 * @returns {{ chunks: string[], write: (text: string) => void }} Writer stub.
 */
function createWriter() {
  const chunks = [];
  return {
    chunks,
    write(text) {
      chunks.push(text);
    },
  };
}

describe('runDuplicationGate', () => {
  test('passes when the report has no clones', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() =>
      JSON.stringify({
        duplicates: [],
        statistics: {
          total: {
            clones: 0,
            percentage: 0,
            percentageTokens: 0,
          },
        },
      })
    );
    const stdout = createWriter();
    const stderr = createWriter();

    const result = runDuplicationGate({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    expect(result).toEqual({ exitCode: 0, clones: 0 });
    expect(stdout.chunks.join('')).toContain(
      'Checked duplication report: 0 clones.'
    );
    expect(stderr.chunks).toEqual([]);
  });

  test('fails when the report contains clones', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() =>
      JSON.stringify({
        duplicates: [{ id: 'clone-1' }],
        statistics: {
          total: {
            clones: 1,
            percentage: 1.6,
            percentageTokens: 1.43,
          },
        },
      })
    );
    const stdout = createWriter();
    const stderr = createWriter();

    const result = runDuplicationGate({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    expect(result).toEqual({ exitCode: 1, clones: 1 });
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain('Duplication gate found 1 clone.');
    expect(stderr.chunks.join('')).toContain('Report summary: 1 clone');
  });
});
