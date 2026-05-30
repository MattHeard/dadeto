import { jest } from '@jest/globals';
import { createCheckDuplicationHandle } from '../../src/core/scripts/check-duplication.js';

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

describe('createCheckDuplicationHandle', () => {
  test('creates a handle with default dependencies', () => {
    const handle = createCheckDuplicationHandle();

    expect(typeof handle).toBe('function');
  });

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
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

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
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 1 });
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain('Duplication gate found 1 clone.');
    expect(stderr.chunks.join('')).toContain('Report summary: 1 clone');
  });

  test('fails when jscpd fails to launch', () => {
    const spawnImpl = jest.fn(() => ({
      error: new Error('boom'),
      signal: null,
    }));
    const readFileSync = jest.fn();
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 0 });
    expect(readFileSync).not.toHaveBeenCalled();
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain(
      'Duplication gate failed to launch jscpd: boom'
    );
  });

  test('fails when jscpd exits because of a signal', () => {
    const spawnImpl = jest.fn(() => ({
      signal: 'SIGKILL',
    }));
    const readFileSync = jest.fn();
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 0 });
    expect(readFileSync).not.toHaveBeenCalled();
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain(
      'Duplication gate was terminated by signal SIGKILL'
    );
  });

  test('fails when jscpd exits with an unknown status', () => {
    const spawnImpl = jest.fn(() => ({ signal: null }));
    const readFileSync = jest.fn();
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 0 });
    expect(readFileSync).not.toHaveBeenCalled();
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks).toEqual([]);
  });

  test('fails when jscpd exits with a non-zero status', () => {
    const spawnImpl = jest.fn(() => ({ status: 2, signal: null }));
    const readFileSync = jest.fn();
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 2, clones: 0 });
    expect(readFileSync).not.toHaveBeenCalled();
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks).toEqual([]);
  });

  test('fails when the report cannot be read', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() => {
      throw new Error('missing');
    });
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 0 });
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain(
      'Duplication gate could not read report at reports/duplication/jscpd-report.json'
    );
  });

  test('uses total clone statistics when duplicates are omitted', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() =>
      JSON.stringify({
        statistics: {
          total: {
            clones: 2,
            percentage: 3.2,
            percentageTokens: 4.5,
          },
        },
      })
    );
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 2 });
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain(
      'Duplication gate found 2 clones.'
    );
    expect(stderr.chunks.join('')).toContain(
      'Report summary: 2 clones, 3.2% duplicated lines, 4.5% duplicated tokens.'
    );
  });

  test('reports clones without summary data', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() =>
      JSON.stringify({
        duplicates: [{ id: 'clone-1' }, { id: 'clone-2' }],
      })
    );
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 2 });
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain(
      'Duplication gate found 2 clones.'
    );
    expect(stderr.chunks.join('')).toContain(
      'See reports/duplication/jscpd-report.json for the detailed clone report.'
    );
    expect(stderr.chunks.join('')).not.toContain('Report summary:');
  });

  test('treats missing clone data as zero clones', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() =>
      JSON.stringify({
        statistics: {},
      })
    );
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 0, clones: 0 });
    expect(stdout.chunks.join('')).toContain(
      'Checked duplication report: 0 clones.'
    );
    expect(stderr.chunks).toEqual([]);
  });
});
