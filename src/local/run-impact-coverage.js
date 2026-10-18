import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createScopedCoverageCommand } from '../core/local/checkImpactPlan.js';
import { readScopedCoverage } from './read-impact-coverage.js';
/** @typedef {import('../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{status: number | null, stdout?: string, stderr?: string, error?: Error}} CoverageExecution */
/** @typedef {(permission: AllowEffects, command: string, args: string[], options: object) => CoverageExecution} ProcessRunner */
/** @typedef {(permission: AllowEffects, tests: string[], sourceFiles: string[]) => CoverageExecution & {coverage?: object, command: string, coverageError?: string}} ScopedCoverageRunner */

/**
 * @param {{rootDir: string, runCommand: ProcessRunner}} deps Local process dependencies.
 * @returns {ScopedCoverageRunner} Permission-aware scoped coverage runner.
 */
export function createScopedImpactCoverageRunner({ rootDir, runCommand }) {
  return (permission, tests, sourceFiles) => {
    const directory = mkdtempSync(path.join(tmpdir(), 'impact-coverage-'));
    const { args, command, options } = createScopedCoverageCommand({
      paths: { rootDir, pathModule: path },
      coverageDirectory: directory,
      selection: { tests, sourceFiles },
      environment: process.env,
    });
    /** @type {CoverageExecution} */
    let execution = { status: null };
    let coverage;
    let coverageError;
    try {
      execution = runCommand(permission, process.execPath, args, options);
      ({ coverage, coverageError } = readScopedCoverage(directory));
    } catch (error) {
      execution = {
        status: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
      coverageError = execution.error.message;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    return {
      ...execution,
      coverage,
      command,
      ...(coverageError ? { coverageError } : {}),
    };
  };
}
