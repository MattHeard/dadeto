import { createAlgZooCoverageCostReportCommandHandle } from '../../../src/core/local/algZooCoverageCostReportCommand/index.js';
import { createAlgZooCoverageCostInput } from '../../fixtures/interpretability/algZooCoverageCostInput.js';

/**
 * Build a command and capture injected effects.
 * @param {(path: string) => string} readFile Input file reader.
 * @returns {{run: (args: string[]) => void, stdout: string[], stderr: string[], exitCodes: number[]}} Command and outputs.
 */
function createCommand(readFile) {
  const stdout = [];
  const stderr = [];
  const exitCodes = [];
  const run = createAlgZooCoverageCostReportCommandHandle({
    readFile,
    writeStdout: text => stdout.push(text),
    writeStderr: text => stderr.push(text),
    setExitCode: code => exitCodes.push(code),
  });
  return { run, stdout, stderr, exitCodes };
}

describe('AlgZoo coverage-cost report command', () => {
  it('rejects argument counts without reading the source file', () => {
    const command = createCommand(() => {
      throw new Error('reader should not run');
    });
    command.run([]);
    command.run(['one.json', 'two.json']);

    expect(command.stderr).toHaveLength(2);
    expect(command.stderr[0]).toContain('Usage:');
    expect(command.exitCodes).toEqual([2, 2]);
  });

  it('rejects missing or malformed input without echoing source data', () => {
    const unreadable = createCommand(() => {
      throw new Error('private file contents');
    });
    unreadable.run(['pairs.json']);
    expect(unreadable.stderr[0]).toContain('Could not read or parse');
    expect(unreadable.stderr.join('')).not.toContain('private file contents');

    const invalid = createCommand(() => '{"private":"secret"}');
    invalid.run(['pairs.json']);
    expect(invalid.stderr[0]).toContain('Invalid locked pair input');
    expect(invalid.stderr.join('')).not.toContain('secret');
    expect(invalid.stdout).toEqual([]);
    expect(invalid.exitCodes).toEqual([1]);
  });

  it('reads the stored pair record and prints the stable report', () => {
    const input = JSON.stringify(createAlgZooCoverageCostInput());
    const command = createCommand(path => {
      expect(path).toBe('locked-pairs.json');
      return input;
    });
    command.run(['locked-pairs.json']);

    expect(command.stdout[0]).toContain(
      '# AlgZoo M16,10 map-coverage cost analysis'
    );
    expect(command.stdout[0].match(/^\| [0-9]+ \|/gm)).toHaveLength(64);
    expect(command.stderr).toEqual([]);
    expect(command.exitCodes).toEqual([0]);
  });

  it('reports a renderer rejection without writing a partial report', () => {
    const command = createCommand(() =>
      JSON.stringify(createAlgZooCoverageCostInput())
    );
    const run = createAlgZooCoverageCostReportCommandHandle({
      readFile: () => JSON.stringify(createAlgZooCoverageCostInput()),
      writeStdout: text => command.stdout.push(text),
      writeStderr: text => command.stderr.push(text),
      setExitCode: code => command.exitCodes.push(code),
      renderReport: () => ({
        valid: false,
        errors: [{ code: 'invalid-analysis-result' }],
      }),
    });
    run(['locked-pairs.json']);
    expect(command.stdout).toEqual([]);
    expect(command.stderr[0]).toContain(
      'Could not render coverage-cost report'
    );
    expect(command.exitCodes).toEqual([1]);
  });
});
