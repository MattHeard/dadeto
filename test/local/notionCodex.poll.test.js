import {
  getActiveRunId,
  runNotionCodexPoll,
} from '../../src/local/notion-codex/poll.js';

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
    expect(result.prompt).toContain('its Status is not Done');
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

  test('uses the current clock when now is omitted', async () => {
    const originalDate = Date;
    const fixedNow = new originalDate('2026-04-30T07:45:30.000Z');
    const writes = [];
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) {
          return new originalDate(fixedNow);
        }

        return new originalDate(...args);
      }

      static now() {
        return fixedNow.getTime();
      }

      static parse(value) {
        return originalDate.parse(value);
      }

      static UTC(...args) {
        return originalDate.UTC(...args);
      }
    };

    try {
      const result = await runNotionCodexPoll({
        config,
        repoRoot: '/tmp/repo',
        stateStore: {
          async readState() {
            return { activeRun: null, eventLog: [] };
          },
          async writeState() {
            writes.push(true);
          },
        },
        launcher: {
          async launch() {
            return { pid: 900 };
          },
        },
      });

      expect(result.runId).toBe('2026-04-30T07:45:30.000Z--notion-codex');
      expect(writes).toHaveLength(1);
    } finally {
      global.Date = originalDate;
    }
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

  test('skips launching when the active process is alive through process.kill', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:46:30.000Z'),
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'existing-run',
              pid: process.pid,
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

  test('skips launching when the active run is missing a pid', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:46:45.000Z'),
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'pidless-run',
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
      runId: 'pidless-run',
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

  test('records a launched run with a null pid when the launcher omits one', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:47:30.000Z'),
      stateStore: {
        async readState() {
          return {
            activeRun: null,
            eventLog: 'not-an-array',
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch() {
          return {};
        },
      },
    });

    expect(result.launched).toBe(true);
    expect(writes[0].eventLog).toEqual([
      {
        at: '2026-04-30T07:47:30.000Z',
        type: 'launched',
        runId: '2026-04-30T07:47:30.000Z--notion-codex',
        pid: null,
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

  test('uses the default idle backoff and summary when config omits them', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config: {},
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:48:30.000Z'),
      isProcessAliveImpl: () => false,
      outcomeStore: {
        async readOutcome(runId) {
          expect(runId).toBe('idle-run');
          return {
            outcome: 'idle',
          };
        },
      },
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'idle-run',
              pid: 781,
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
          throw new Error('should not launch during default idle backoff');
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
      lastSummary:
        'Observed idle Notion Codex run idle-run; next poll after 2026-04-30T07:49:30.000Z.',
      idleBackoffExponent: 0,
      nextPollAfter: '2026-04-30T07:49:30.000Z',
      activeRun: null,
    });
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

  test('launches when the next poll timestamp is invalid', async () => {
    const writes = [];
    const launchPayloads = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:52:00.000Z'),
      stateStore: {
        async readState() {
          return {
            activeRun: null,
            nextPollAfter: 'not-a-date',
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
          return { pid: 785 };
        },
      },
    });

    expect(result.launched).toBe(true);
    expect(launchPayloads).toHaveLength(1);
    expect(writes[0].activeRun).toMatchObject({
      runId: '2026-04-30T07:52:00.000Z--notion-codex',
      pid: 785,
    });
  });

  test('marks a dead run completed when the process is gone', async () => {
    const originalKill = process.kill;
    const writes = [];
    const launchPayloads = [];
    process.kill = () => {
      const error = new Error('gone');
      error.code = 'ESRCH';
      throw error;
    };

    try {
      const result = await runNotionCodexPoll({
        config,
        repoRoot: '/tmp/repo',
        now: new Date('2026-04-30T07:53:00.000Z'),
        stateStore: {
          async readState() {
            return {
              activeRun: {
                runId: 'dead-run',
                pid: 786,
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
            return { pid: 7861 };
          },
        },
      });

      expect(result.launched).toBe(true);
      expect(launchPayloads).toHaveLength(1);
      expect(launchPayloads[0]).toMatchObject({
        repoRoot: '/tmp/repo',
        runId: '2026-04-30T07:53:00.000Z--notion-codex',
      });
      expect(writes[0].eventLog[0]).toMatchObject({
        type: 'completed',
        runId: 'dead-run',
        pid: 786,
      });
      expect(writes[0].eventLog[1]).toMatchObject({
        type: 'launched',
        runId: '2026-04-30T07:53:00.000Z--notion-codex',
        pid: 7861,
      });
    } finally {
      process.kill = originalKill;
    }
  });

  test('returns null when the active run id is missing', () => {
    expect(getActiveRunId(null)).toBeNull();
    expect(getActiveRunId({})).toBeNull();
    expect(getActiveRunId({ runId: 42 })).toBeNull();
  });

  test('keeps a run active when the process is alive but permission is denied', async () => {
    const originalKill = process.kill;
    const writes = [];
    process.kill = () => {
      const error = new Error('denied');
      error.code = 'EPERM';
      throw error;
    };

    try {
      const result = await runNotionCodexPoll({
        config,
        repoRoot: '/tmp/repo',
        now: new Date('2026-04-30T07:54:00.000Z'),
        stateStore: {
          async readState() {
            return {
              activeRun: {
                runId: 'live-run',
                pid: 787,
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
        runId: 'live-run',
      });
      expect(writes).toEqual([]);
    } finally {
      process.kill = originalKill;
    }
  });

  test('propagates unexpected process state errors', async () => {
    const originalKill = process.kill;
    process.kill = () => {
      throw new Error('boom');
    };

    try {
      await expect(
        runNotionCodexPoll({
          config,
          repoRoot: '/tmp/repo',
          now: new Date('2026-04-30T07:55:00.000Z'),
          stateStore: {
            async readState() {
              return {
                activeRun: {
                  runId: 'error-run',
                  pid: 788,
                },
                eventLog: [],
              };
            },
            async writeState() {},
          },
          launcher: {
            async launch() {
              throw new Error('should not launch');
            },
          },
        })
      ).rejects.toThrow('boom');
    } finally {
      process.kill = originalKill;
    }
  });

  test('propagates non-object process.kill failures unchanged', async () => {
    const originalKill = process.kill;
    process.kill = () => {
      throw 'boom';
    };

    try {
      await expect(
        runNotionCodexPoll({
          config,
          repoRoot: '/tmp/repo',
          now: new Date('2026-04-30T07:56:00.000Z'),
          stateStore: {
            async readState() {
              return {
                activeRun: {
                  runId: 'non-object-error-run',
                  pid: 788,
                },
                eventLog: [],
              };
            },
            async writeState() {
              throw new Error('should not write');
            },
          },
          launcher: {
            async launch() {
              throw new Error('should not launch');
            },
          },
        })
      ).rejects.toBe('boom');
    } finally {
      process.kill = originalKill;
    }
  });
});
