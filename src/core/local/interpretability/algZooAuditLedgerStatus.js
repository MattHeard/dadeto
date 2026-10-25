/**
 * Create a read-only command that reports verified AlgZoo ledger metadata.
 * @param {{readAll: () => Promise<Array<Record<string, any>>>, writeStdout: (text: string) => void, writeStderr: (text: string) => void, setExitCode: (code: number) => void}} dependencies Ledger reader and output effects.
 * @returns {(args?: string[]) => Promise<void>} Command handler.
 */
export function createAlgZooAuditLedgerStatusCommand(dependencies) {
  if (
    typeof dependencies?.readAll !== 'function' ||
    typeof dependencies?.writeStdout !== 'function' ||
    typeof dependencies?.writeStderr !== 'function' ||
    typeof dependencies?.setExitCode !== 'function'
  ) {
    throw new TypeError('Audit ledger status dependencies are required.');
  }
  return async (args = []) => {
    if (args.length !== 0) {
      dependencies.writeStderr(
        'Usage: npm run interpretability:algzoo:audit-ledger-status\n'
      );
      dependencies.setExitCode(2);
      return;
    }
    try {
      const records = await dependencies.readAll();
      const completedSessions = new Set(
        records
          .filter(record =>
            [
              'session-finished',
              'run-failed',
              'budget-stopped',
              'run-interrupted',
            ].includes(record.eventType)
          )
          .map(record => record.payload.sessionId)
          .filter(sessionId => typeof sessionId === 'string')
      );
      const interruptedSessionCount = records.filter(
        record =>
          record.eventType === 'session-started' &&
          typeof record.payload.sessionId === 'string' &&
          !completedSessions.has(record.payload.sessionId)
      ).length;
      const summary = {
        hashChain: 'verified',
        recordCount: records.length,
        headHash: records.at(-1)?.hash ?? null,
        interruptedSessionCount,
      };
      dependencies.writeStdout(`${JSON.stringify(summary, null, 2)}\n`);
    } catch {
      dependencies.writeStderr('Could not verify the AlgZoo audit ledger.\n');
      dependencies.setExitCode(1);
    }
  };
}
