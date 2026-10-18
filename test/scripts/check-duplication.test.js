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

    expect(handle()).toEqual({ exitCode: 0, clones: 0 });
  });
});

describe('createCheckDuplicationHandle with injected dependencies', () => {
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
    expect(spawnImpl).toHaveBeenCalledWith(
      'node',
      ['src/local/run-clone-scanner.js', '.jscpd.json'],
      expect.objectContaining({ cwd: expect.any(String) })
    );
    expect(readFileSync).toHaveBeenCalledWith(
      'reports/duplication/jscpd-report.json',
      'utf8'
    );
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

  test('summarizes clone totals when the report omits the clones field', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() =>
      JSON.stringify({
        duplicates: [{ id: 'clone-1' }],
        statistics: {
          total: {
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
    expect(stderr.chunks.join('')).toContain('Report summary: 0 clones');
    expect(stderr.chunks.join('')).toContain(
      'Report summary: 0 clones, 1.6% duplicated lines, 1.43% duplicated tokens.'
    );
    expect(stderr.chunks.join('')).not.toContain('undefined');
  });
});

describe('createCheckDuplicationHandle process failures', () => {
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

  test('uses the default relative path fallback when reporting a missing report', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() => {
      throw new Error('missing');
    });
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, clones: 0 });
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

  test('lists up to five clone file and line pairs on failure', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const duplicates = Array.from({ length: 6 }, (_value, index) => ({
      firstFile: {
        name: `src/core/file-${index}.js`,
        start: index + 1,
        end: index + 3,
      },
      secondFile: {
        name: `src/core/file-${index + 10}.js`,
        start: (index + 1) * 10,
        end: (index + 1) * 10 + 2,
      },
    }));
    const readFileSync = jest.fn(() => JSON.stringify({ duplicates }));
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stderr,
    });

    expect(handle()).toEqual({ exitCode: 1, clones: 6 });
    expect(stderr.chunks.join('')).toContain(
      'Clone locations (up to 5 shown):'
    );
    expect(stderr.chunks.join('')).toContain(
      'src/core/file-0.js:1-3 ↔ src/core/file-10.js:10-12'
    );
    expect(stderr.chunks.join('')).toContain(
      '1 more clone(s); see detailed report.'
    );
    expect(stderr.chunks.join('')).not.toContain('src/core/file-5.js');
    expect(stderr.chunks.join('')).toContain(
      'See reports/duplication/jscpd-report.json for the detailed clone report.'
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
    expect(stderr.chunks).toEqual([
      'Duplication gate found 2 clones.\n',
      'See reports/duplication/jscpd-report.json for the detailed clone report.\n',
    ]);
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

  test('treats non-numeric clone statistics as zero clones', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() =>
      JSON.stringify({ statistics: { total: { clones: '2' } } })
    );
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDuplicationHandle({
      spawnImpl,
      readFileSync,
      stdout,
      stderr,
    });

    expect(handle()).toEqual({ exitCode: 0, clones: 0 });
    expect(stdout.chunks).toEqual(['Checked duplication report: 0 clones.\n']);
    expect(stderr.chunks).toEqual([]);
  });
});
