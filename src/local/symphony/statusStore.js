import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * @param {{
 *   statusPath: string,
 *   logDir: string,
 *   mkdirImpl?: typeof mkdir,
 *   readFileImpl?: typeof readFile,
 *   writeFileImpl?: typeof writeFile
 * }} options
 * @returns {{
 *   readStatus: () => Promise<Record<string, unknown> | null>,
 *   writeStatus: (status: Record<string, unknown>) => Promise<void>
 * }} Status store for the local Symphony scaffold.
 */
export function createSymphonyStatusStore(options) {
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const readFileImpl = options.readFileImpl ?? readFile;
  const writeFileImpl = options.writeFileImpl ?? writeFile;

  return {
    async readStatus() {
      try {
        const rawStatus = await readFileImpl(options.statusPath, 'utf8');
        return JSON.parse(rawStatus);
      } catch (error) {
        if (error && typeof error === 'object' && error.code === 'ENOENT') {
          return null;
        }

        throw error;
      }
    },

    async writeStatus(status) {
      const logPath = path.join(
        options.logDir,
        'runs',
        `${status.startedAt.replaceAll(':', '-')}--startup.log`
      );

      await mkdirImpl(path.dirname(options.statusPath), { recursive: true });
      await mkdirImpl(path.dirname(logPath), { recursive: true });
      await writeFileImpl(options.statusPath, JSON.stringify(status, null, 2), 'utf8');
      await writeFileImpl(
        logPath,
        JSON.stringify(
          {
            event: 'startup',
            startedAt: status.startedAt,
            state: status.state,
            currentBeadId: status.currentBeadId ?? null,
            currentBeadTitle: status.currentBeadTitle ?? null,
            currentBeadPriority: status.currentBeadPriority ?? null,
            lastPollSummary: status.lastPollSummary ?? '',
            latestEvidence: status.latestEvidence ?? '',
            queueEvidence: Array.isArray(status.queueEvidence)
              ? status.queueEvidence
              : [],
            workflowExists: status.workflow?.exists ?? false,
            trackerKind: status.config?.tracker?.kind ?? 'unknown',
          },
          null,
          2
        ),
        'utf8'
      );
    },
  };
}
