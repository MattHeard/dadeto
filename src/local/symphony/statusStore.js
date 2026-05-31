import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
export function createSymphonyStatusStore(options) {
  const mkdirImpl = options.mkdirImpl ?? mkdir, readFileImpl = options.readFileImpl ?? readFile, writeFileImpl = options.writeFileImpl ?? writeFile;
  const getLogPath = status => path.join(options.logDir, 'runs', `${getStatusLogStartedAt(status).replaceAll(':', '-')}--${getStatusLogEvent(status)}.log`);
  const readStatus = async () => {
    try { return JSON.parse(await readFileImpl(options.statusPath, 'utf8')); } catch (error) { if (error && typeof error === 'object' && error.code === 'ENOENT') return null; throw error; }
  };
  const writeStatus = async status => {
    const logPath = getLogPath(status), payload = {
      event: getStatusLogEvent(status),
      startedAt: getStatusLogStartedAt(status),
      state: status.state,
      currentBeadId: status.currentBeadId ?? null,
      currentBeadTitle: status.currentBeadTitle ?? null,
      currentBeadPriority: status.currentBeadPriority ?? null,
      lastPollSummary: status.lastPollSummary ?? '',
      latestEvidence: status.latestEvidence ?? '',
      operatorRecommendation: status.operatorRecommendation ?? '',
      operatorTrustReason: status.operatorTrustReason ?? '',
      queueEvidence: Array.isArray(status.queueEvidence) ? status.queueEvidence : [],
      runtime: status.runtime && typeof status.runtime === 'object' ? status.runtime : null,
      operatorArtifacts: status.operatorArtifacts && typeof status.operatorArtifacts === 'object' ? status.operatorArtifacts : null,
      activeRun: status.activeRun && typeof status.activeRun === 'object' ? status.activeRun : null,
      lastOutcome: status.lastOutcome && typeof status.lastOutcome === 'object' ? status.lastOutcome : null,
      lastLaunchAttempt: status.lastLaunchAttempt && typeof status.lastLaunchAttempt === 'object' ? status.lastLaunchAttempt : null,
      eventLog: Array.isArray(status.eventLog) ? status.eventLog : [],
      workflowExists: status.workflow?.exists ?? false,
      trackerKind: status.config?.tracker?.kind ?? 'unknown',
    };
    await mkdirImpl(path.dirname(options.statusPath), { recursive: true });
    await mkdirImpl(path.dirname(logPath), { recursive: true });
    await writeFileImpl(options.statusPath, JSON.stringify(status, null, 2), 'utf8');
    await writeFileImpl(logPath, JSON.stringify(payload, null, 2), 'utf8');
    };
  return { readStatus, writeStatus };
}
function getStatusLogEvent(status) {
  if (status.activeRun && typeof status.activeRun === 'object') return 'launch';
  if (status.lastLaunchAttempt && typeof status.lastLaunchAttempt === 'object' && status.lastLaunchAttempt.outcome === 'failed') return 'launch-failed';
  if (status.lastOutcome && typeof status.lastOutcome === 'object' && typeof status.lastOutcome.outcome === 'string') return status.lastOutcome.outcome;
  return 'startup';
}

function getStatusLogStartedAt(status) {
  if (status.activeRun && typeof status.activeRun === 'object' && typeof status.activeRun.startedAt === 'string') return status.activeRun.startedAt;
  if (typeof status.startedAt === 'string') return status.startedAt;
  throw new Error('Cannot write Symphony status without a startedAt timestamp.');
}
