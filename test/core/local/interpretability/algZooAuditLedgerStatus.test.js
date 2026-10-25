import { describe, expect, it, jest } from '@jest/globals';
import { createAlgZooAuditLedgerStatusCommand } from '../../../../src/core/local/interpretability/algZooAuditLedgerStatus.js';

/**
 * @param {() => Promise<Array<Record<string, any>>>} readAll Synthetic ledger reader.
 * @returns {{command: (args?: string[]) => Promise<void>, output: {stdout:string,stderr:string,exitCode:number}}} Test command and captured output.
 */
function createHarness(readAll) {
  const output = { stdout: '', stderr: '', exitCode: 0 };
  const command = createAlgZooAuditLedgerStatusCommand({
    readAll,
    writeStdout: text => {
      output.stdout += text;
    },
    writeStderr: text => {
      output.stderr += text;
    },
    setExitCode: code => {
      output.exitCode = code;
    },
  });
  return { command, output };
}

describe('AlgZoo audit ledger status command', () => {
  it.each([undefined, null, {}])(
    'rejects missing command dependencies: %p',
    dependencies => {
      expect(() => createAlgZooAuditLedgerStatusCommand(dependencies)).toThrow(
        TypeError
      );
    }
  );

  it.each(['readAll', 'writeStdout', 'writeStderr', 'setExitCode'])(
    'rejects a missing %s adapter before running effects',
    field => {
      const readAll = jest.fn(async () => []);
      const dependencies = {
        readAll,
        writeStdout: jest.fn(),
        writeStderr: jest.fn(),
        setExitCode: jest.fn(),
        [field]: null,
      };
      expect(() => createAlgZooAuditLedgerStatusCommand(dependencies)).toThrow(
        TypeError
      );
      expect(readAll).not.toHaveBeenCalled();
    }
  );

  it('reports verified chain metadata without emitting record payloads', async () => {
    const { command, output } = createHarness(async () => [
      {
        sequence: 1,
        eventType: 'session-started',
        payload: { sessionId: 'private-session-1' },
        hash: 'a'.repeat(64),
      },
      {
        sequence: 2,
        eventType: 'pair-scored',
        payload: {
          sessionId: 'private-session-1',
          privateSubmissionText: 'never print this',
        },
        hash: 'b'.repeat(64),
      },
    ]);

    await command();

    expect(JSON.parse(output.stdout)).toEqual({
      hashChain: 'verified',
      recordCount: 2,
      headHash: 'b'.repeat(64),
      interruptedSessionCount: 1,
    });
    expect(output.stdout).not.toContain('private-session-1');
    expect(output.stdout).not.toContain('never print this');
    expect(output.stderr).toBe('');
    expect(output.exitCode).toBe(0);
  });

  it('counts only started sessions without a terminal event and ignores malformed session IDs', async () => {
    const ids = ['finished', 'failed', 'stopped', 'interrupted', 'pending'];
    const terminalEvents = [
      'session-finished',
      'run-failed',
      'budget-stopped',
      'run-interrupted',
    ];
    const records = [
      ...ids.map(sessionId => ({
        eventType: 'session-started',
        payload: { sessionId },
        hash: 'a'.repeat(64),
      })),
      ...terminalEvents.map((eventType, index) => ({
        eventType,
        payload: { sessionId: ids[index] },
        hash: 'a'.repeat(64),
      })),
      {
        eventType: 'run-failed',
        payload: { sessionId: 17 },
        hash: 'a'.repeat(64),
      },
      { eventType: 'session-started', payload: {}, hash: 'b'.repeat(64) },
    ];
    const { command, output } = createHarness(async () => records);
    await command();
    expect(JSON.parse(output.stdout)).toEqual({
      hashChain: 'verified',
      recordCount: 11,
      headHash: 'b'.repeat(64),
      interruptedSessionCount: 1,
    });
    expect(output.stdout).not.toContain('pending');
    expect(output.stderr).toBe('');
  });

  it('reports an empty ledger without inventing an external anchor', async () => {
    const { command, output } = createHarness(async () => []);

    await command();

    expect(JSON.parse(output.stdout)).toEqual({
      hashChain: 'verified',
      recordCount: 0,
      headHash: null,
      interruptedSessionCount: 0,
    });
  });

  it('fails closed when the ledger cannot be read or verified', async () => {
    const { command, output } = createHarness(async () => {
      throw new Error('sensitive underlying details');
    });

    await command();

    expect(output.stdout).toBe('');
    expect(output.stderr).toBe('Could not verify the AlgZoo audit ledger.\n');
    expect(output.stderr).not.toContain('sensitive underlying details');
    expect(output.exitCode).toBe(1);
  });

  it('rejects arguments before reading the ledger', async () => {
    const readAll = jest.fn(async () => []);
    const { command, output } = createHarness(readAll);

    await command(['--payloads']);

    expect(readAll).not.toHaveBeenCalled();
    expect(output.stderr).toContain('Usage:');
    expect(output.exitCode).toBe(2);
  });
});
