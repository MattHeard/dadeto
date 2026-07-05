import { jest } from '@jest/globals';
import {
  buildCoverageSummary,
  createWriteCoverageSummaryHandle,
} from '../../../src/core/scripts/write-coverage-summary.js';

describe('write coverage summary', () => {
  test('builds a coverage summary from a coverage map', () => {
    expect(
      buildCoverageSummary({
        getCoverageSummary: () => ({
          toJSON: () => ({ lines: 100 }),
        }),
        files: () => ['src/example.js'],
        fileCoverageFor: () => ({
          toSummary: () => ({
            toJSON: () => ({ lines: 90 }),
          }),
        }),
      })
    ).toEqual({
      total: { lines: 100 },
      'src/example.js': { lines: 90 },
    });
  });

  test('creates a command handle that reads and writes the summary file', () => {
    const readFile = jest.fn(() =>
      JSON.stringify({
        statements: { total: 1 },
      })
    );
    const writeFile = jest.fn();
    const createCoverageMap = jest.fn(() => ({
      getCoverageSummary: () => ({
        toJSON: () => ({ statements: 1 }),
      }),
      files: () => ['src/example.js'],
      fileCoverageFor: () => ({
        toSummary: () => ({
          toJSON: () => ({ statements: 1 }),
        }),
      }),
    }));

    const handle = createWriteCoverageSummaryHandle({
      readFile,
      writeFile,
      createCoverageMap,
      coverageFinalPath: 'reports/coverage/coverage-final.json',
      coverageSummaryPath: 'reports/coverage/coverage-summary.json',
    });

    handle();

    expect(readFile).toHaveBeenCalledWith(
      'reports/coverage/coverage-final.json',
      'utf8'
    );
    expect(createCoverageMap).toHaveBeenCalledWith({
      statements: { total: 1 },
    });
    expect(writeFile).toHaveBeenCalledWith(
      'reports/coverage/coverage-summary.json',
      `${JSON.stringify(
        {
          total: { statements: 1 },
          'src/example.js': { statements: 1 },
        },
        null,
        2
      )}\n`
    );
  });

  test('uses default coverage paths when none are provided', () => {
    const readFile = jest.fn(() =>
      JSON.stringify({
        statements: { total: 1 },
      })
    );
    const writeFile = jest.fn();
    const createCoverageMap = jest.fn(() => ({
      getCoverageSummary: () => ({
        toJSON: () => ({ statements: 1 }),
      }),
      files: () => [],
      fileCoverageFor: () => ({
        toSummary: () => ({
          toJSON: () => ({ statements: 1 }),
        }),
      }),
    }));

    const handle = createWriteCoverageSummaryHandle({
      readFile,
      writeFile,
      createCoverageMap,
    });

    handle();

    expect(readFile).toHaveBeenCalledWith(
      'reports/coverage/coverage-final.json',
      'utf8'
    );
    expect(writeFile).toHaveBeenCalledWith(
      'reports/coverage/coverage-summary.json',
      `${JSON.stringify(
        {
          total: { statements: 1 },
        },
        null,
        2
      )}\n`
    );
  });

  test('throws a clear error when coverage output is missing', () => {
    const missingFileError = new Error('missing');
    missingFileError.code = 'ENOENT';

    const readFile = jest.fn(() => {
      throw missingFileError;
    });
    const writeFile = jest.fn();
    const createCoverageMap = jest.fn();

    const handle = createWriteCoverageSummaryHandle({
      readFile,
      writeFile,
      createCoverageMap,
      coverageFinalPath: 'reports/coverage/coverage-final.json',
      coverageSummaryPath: 'reports/coverage/coverage-summary.json',
    });

    expect(handle).toThrow(
      'Coverage summary could not find reports/coverage/coverage-final.json'
    );
    expect(createCoverageMap).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  test('rethrows unexpected read errors unchanged', () => {
    const readFileError = new Error('permission denied');

    const readFile = jest.fn(() => {
      throw readFileError;
    });
    const writeFile = jest.fn();
    const createCoverageMap = jest.fn();

    const handle = createWriteCoverageSummaryHandle({
      readFile,
      writeFile,
      createCoverageMap,
      coverageFinalPath: 'reports/coverage/coverage-final.json',
      coverageSummaryPath: 'reports/coverage/coverage-summary.json',
    });

    expect(handle).toThrow(readFileError);
    expect(createCoverageMap).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
