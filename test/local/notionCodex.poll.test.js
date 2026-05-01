import { runNotionCodexPoll } from '../../src/local/notion-codex/poll.js';

const config = {
  notion: {
    dadetoPageId: 'page-id',
    dadetoPageUrl: 'https://notion.example/page-id',
    symphonyPageId: 'symphony-page-id',
    symphonyPageUrl: 'https://notion.example/symphony-page-id',
    taskDataSourceUrl: 'collection://tasks',
    taskContext: 'At lorandil',
    taskStatus: 'Not Started',
    messageSearchQuery: 'codex',
    inboxPageIds: ['inbox-page'],
    apiTokenEnvNames: ['NOTION_API_KEY', 'NOTION_TOKEN'],
  },
  idleBackoff: {
    baseDelayMs: 60000,
    initialExponent: 0,
    maxExponent: 9,
  },
};

describe('local notion codex poll runner', () => {
  test('builds a dry-run prompt without launching or writing state', async () => {
    const writes = [];
    const launches = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:45:00.000Z'),
      dryRun: true,
      stateStore: {
        async readState() {
          return { activeRun: null, eventLog: [] };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch(payload) {
          launches.push(payload);
          return { pid: 123 };
        },
      },
    });

    expect(result).toMatchObject({
      launched: false,
      dryRun: true,
      runId: '2026-04-30T07:45:00.000Z--notion-codex',
    });
    expect(result.prompt).toContain('Symphony page ID: symphony-page-id');
    expect(result.prompt).toContain('first page mention under the "# Backlog"');
    expect(result.prompt).toContain('collection://tasks');
    expect(result.prompt).toContain('Status is "Not Started"');
    expect(result.prompt).toContain(
      'move its page under Symphony Completed before stopping'
    );
    expect(result.prompt).toContain(
      'create a child page under the Symphony page'
    );
    expect(result.prompt).toContain('"outcome":"idle"');
    expect(writes).toEqual([]);
    expect(launches).toEqual([]);
  });

  test('skips launching when an active run is still alive', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:46:00.000Z'),
      isProcessAliveImpl: () => true,
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'existing-run',
              pid: 777,
            },
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch() {
          throw new Error('should not launch');
        },
      },
    });

    expect(result).toMatchObject({
      launched: false,
      skipped: true,
      reason: 'active-run',
      runId: 'existing-run',
    });
    expect(writes).toEqual([]);
  });

  test('records a launched run after clearing a completed active run', async () => {
    const writes = [];
    const launchPayloads = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:47:00.000Z'),
      isProcessAliveImpl: () => false,
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'old-run',
              pid: 778,
            },
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch(payload) {
          launchPayloads.push(payload);
          return {
            launcherKind: 'codex',
            command: 'codex',
            args: ['exec', payload.prompt],
            pid: 779,
            stdoutPath: '/tmp/stdout.log',
            stderrPath: '/tmp/stderr.log',
          };
        },
      },
    });

    expect(result.launched).toBe(true);
    expect(launchPayloads).toHaveLength(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].activeRun).toMatchObject({
      runId: '2026-04-30T07:47:00.000Z--notion-codex',
      pid: 779,
    });
    expect(writes[0].eventLog).toEqual([
      {
        at: '2026-04-30T07:47:00.000Z',
        type: 'completed',
        runId: 'old-run',
        pid: 778,
      },
      {
        at: '2026-04-30T07:47:00.000Z',
        type: 'launched',
        runId: '2026-04-30T07:47:00.000Z--notion-codex',
        pid: 779,
      },
    ]);
  });

  test('backs off after an idle completed run outcome', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:48:00.000Z'),
      isProcessAliveImpl: () => false,
      outcomeStore: {
        async readOutcome(runId) {
          expect(runId).toBe('idle-run');
          return {
            outcome: 'idle',
            summary: 'No Symphony backlog task found.',
          };
        },
      },
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'idle-run',
              pid: 780,
            },
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch() {
          throw new Error('should not launch during idle backoff');
        },
      },
    });

    expect(result).toMatchObject({
      launched: false,
      skipped: true,
      reason: 'idle-backoff',
      nextDelayMs: 60000,
    });
    expect(writes[0]).toMatchObject({
      lastOutcome: 'idle',
      lastSummary: 'No Symphony backlog task found.',
      idleBackoffExponent: 0,
      nextPollAfter: '2026-04-30T07:49:00.000Z',
      activeRun: null,
    });
    expect(writes[0].eventLog).toEqual([
      {
        at: '2026-04-30T07:48:00.000Z',
        type: 'idle',
        runId: 'idle-run',
        pid: 780,
        nextPollAfter: '2026-04-30T07:49:00.000Z',
      },
    ]);
  });

  test('caps idle backoff at the configured exponent', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config: {
        ...config,
        idleBackoff: {
          baseDelayMs: 60000,
          initialExponent: 0,
          maxExponent: 9,
        },
      },
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:50:00.000Z'),
      isProcessAliveImpl: () => false,
      outcomeStore: {
        async readOutcome() {
          return { outcome: 'idle', summary: 'Still idle.' };
        },
      },
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'idle-run-2',
              pid: 781,
            },
            idleBackoffExponent: 9,
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch() {
          throw new Error('should not launch during idle backoff');
        },
      },
    });

    expect(result.nextDelayMs).toBe(512 * 60000);
    expect(writes[0]).toMatchObject({
      idleBackoffExponent: 9,
      nextPollAfter: '2026-04-30T16:22:00.000Z',
    });
  });

  test('resets idle backoff after a handled run outcome', async () => {
    const writes = [];
    const launchPayloads = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:51:00.000Z'),
      isProcessAliveImpl: () => false,
      outcomeStore: {
        async readOutcome() {
          return { outcome: 'handled', summary: 'Handled a Symphony task.' };
        },
      },
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'handled-run',
              pid: 782,
            },
            idleBackoffExponent: 4,
            nextPollAfter: '2026-04-30T08:00:00.000Z',
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch(payload) {
          launchPayloads.push(payload);
          return { pid: 783 };
        },
      },
    });

    expect(result.launched).toBe(true);
    expect(launchPayloads).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      lastOutcome: 'launched',
      idleBackoffExponent: null,
      nextPollAfter: null,
    });
    expect(writes[0].eventLog[0]).toMatchObject({
      type: 'handled',
      runId: 'handled-run',
    });
  });

  test('resets idle backoff when actionable work is found and launched', async () => {
    const writes = [];
    const launchPayloads = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:47:30.000Z'),
      isProcessAliveImpl: () => false,
      stateStore: {
        async readState() {
          return {
            activeRun: null,
            idleBackoffExponent: 4,
            nextPollAfter: '2026-04-30T07:40:00.000Z',
            lastOutcome: 'idle',
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch(payload) {
          launchPayloads.push(payload);
          return { pid: 784 };
        },
      },
    });

    expect(result.launched).toBe(true);
    expect(launchPayloads).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      lastOutcome: 'launched',
      idleBackoffExponent: null,
      nextPollAfter: null,
      activeRun: {
        runId: '2026-04-30T07:47:30.000Z--notion-codex',
        startedAt: '2026-04-30T07:47:30.000Z',
        pid: 784,
      },
    });
    expect(writes[0].eventLog).toEqual([
      {
        at: '2026-04-30T07:47:30.000Z',
        type: 'launched',
        runId: '2026-04-30T07:47:30.000Z--notion-codex',
        pid: 784,
      },
    ]);
  });
});
