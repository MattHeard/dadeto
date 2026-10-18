import { jest } from '@jest/globals';
import path from 'node:path';
import { createPlanCheckImpactHandle } from '../../src/core/local/checkImpactPlan.js';

/**
 * Capture output from a planner handle.
 * @returns {{chunks: string[], write: (value: string) => void, plan: () => object}} Output collector.
 */
function captureOutput() {
  const chunks = [];
  return {
    chunks,
    write(value) {
      chunks.push(value);
    },
    plan() {
      return JSON.parse(chunks.join(''));
    },
  };
}

/**
 * Construct a planner with permission-aware effect mocks.
 * @param {{argv: string[], runImpl?: (command: string, args: string[], options: object) => object}} options Test inputs.
 * @returns {{result: object, output: ReturnType<typeof captureOutput>, permission: object, runCommand: jest.Mock}} Planner result and mocks.
 */
function runPlanner({ argv, runImpl = () => ({ status: 0, stdout: '' }) }) {
  const permission = {};
  const output = captureOutput();
  const runCommand = jest.fn(
    (receivedPermission, command, args, commandOptions) => {
      expect(receivedPermission).toBe(permission);
      return runImpl(command, args, commandOptions);
    }
  );
  const writeOutput = jest.fn((receivedPermission, value) => {
    expect(receivedPermission).toBe(permission);
    output.write(value);
  });
  const handle = createPlanCheckImpactHandle({
    argv,
    rootDir: process.cwd(),
    processExecPath: process.execPath,
    pathModule: path,
    bindStartupEffectBoundary: handler => handler(permission),
    runCommand,
    writeOutput,
  });
  return { result: handle(), output, permission, runCommand, writeOutput };
}

describe('createPlanCheckImpactHandle', () => {
  it('prints explicit test changes without starting Jest discovery', () => {
    const { result, output, runCommand, writeOutput } = runPlanner({
      argv: ['--files', 'test/core/example.test.js'],
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(runCommand).not.toHaveBeenCalled();
    expect(writeOutput).toHaveBeenCalledTimes(1);
    expect(output.plan()).toMatchObject({
      mode: 'diagnostic',
      tests: ['test/core/example.test.js'],
      staticGates: ['eslint'],
      authoritative: 'npm run check',
    });
  });

  it('uses bounded Jest discovery and normalizes absolute test paths', () => {
    const { output, permission, runCommand } = runPlanner({
      argv: ['--files', 'src/core/example.js'],
      runImpl: () => ({
        status: 0,
        stdout: `${process.cwd()}/test/core/a.test.js\n`,
      }),
    });

    expect(runCommand).toHaveBeenCalledWith(
      permission,
      process.execPath,
      expect.arrayContaining([
        '--runInBand',
        '--listTests',
        '--findRelatedTests',
        'src/core/example.js',
      ]),
      expect.objectContaining({ timeout: 45_000 })
    );
    expect(output.plan()).toMatchObject({
      mode: 'diagnostic',
      tests: ['test/core/a.test.js'],
      staticGates: ['eslint', 'core-parse'],
    });
  });

  it('falls back when Jest discovery errors, fails, or finds no tests', () => {
    for (const runImpl of [
      () => ({ status: 1, stdout: '', error: new Error('selector failed') }),
      () => ({ status: 1, stdout: '' }),
      () => ({ status: 0, stdout: '' }),
      () => ({ status: 0 }),
      () => ({ status: 0 }),
    ]) {
      const { output } = runPlanner({
        argv: ['--files', 'src/core/example.js'],
        runImpl,
      });
      expect(output.plan()).toMatchObject({
        mode: 'full-check',
        commands: ['npm run check'],
      });
    }
  });

  it('resolves a Git diff range and uses directly changed tests', () => {
    const { output, permission, runCommand } = runPlanner({
      argv: ['--base', 'origin/main'],
      runImpl: () => ({ status: 0, stdout: 'test/core/change.test.js\n' }),
    });

    expect(runCommand).toHaveBeenCalledWith(
      permission,
      'git',
      ['diff', '--name-only', 'origin/main...HEAD'],
      expect.objectContaining({ timeout: 45_000 })
    );
    expect(output.plan()).toMatchObject({
      mode: 'diagnostic',
      changedPaths: ['test/core/change.test.js'],
      tests: ['test/core/change.test.js'],
    });
  });

  it('uses an explicit head ref and falls back when Git cannot read the diff', () => {
    const { output, runCommand } = runPlanner({
      argv: ['--base', 'main', '--head', 'feature'],
      runImpl: () => ({ status: 128, stdout: '' }),
    });

    expect(runCommand).toHaveBeenCalledWith(
      expect.anything(),
      'git',
      ['diff', '--name-only', 'main...feature'],
      expect.any(Object)
    );
    expect(output.plan()).toMatchObject({
      mode: 'full-check',
      reason: 'Git could not resolve the requested diff range.',
    });
  });

  it('handles a Git execution error and missing diff output conservatively', () => {
    for (const runImpl of [
      () => ({ status: null, stdout: '', error: new Error('git failed') }),
      () => ({ status: 0 }),
    ]) {
      const { output } = runPlanner({ argv: ['--base', 'main'], runImpl });
      expect(output.plan()).toMatchObject({
        mode: 'full-check',
        commands: ['npm run check'],
      });
    }
  });

  it('accepts relative paths from Jest discovery', () => {
    const { output } = runPlanner({
      argv: ['--files', 'src/cloud/example.js'],
      runImpl: () => ({ status: 0, stdout: 'test/cloud/example.test.js\n' }),
    });
    expect(output.plan()).toMatchObject({
      mode: 'diagnostic',
      tests: ['test/cloud/example.test.js'],
      staticGates: ['eslint'],
    });
  });

  it('falls back with a clear reason for invalid arguments', () => {
    const invalidArgs = [
      [],
      ['--files'],
      ['--files', '--unknown'],
      ['prefix', '--files', 'test/core/a.test.js'],
      ['--files', 'test/core/a.test.js', '--base', 'main'],
      ['--base', 'main', '--head'],
      ['--base'],
      ['--base', 'main', '--head', ''],
      ['--base', 'main', '--unknown'],
      ['--base', 'main', 'HEAD'],
    ];
    for (const argv of invalidArgs) {
      const { output, runCommand } = runPlanner({ argv });
      expect(output.plan()).toMatchObject({
        mode: 'full-check',
        commands: ['npm run check'],
      });
      expect(runCommand).not.toHaveBeenCalled();
    }
  });
});
