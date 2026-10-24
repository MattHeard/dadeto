import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { jest } from '@jest/globals';
import { createAlgZooCodexInvestigator } from '../../../src/local/interpretability/algZooCodexInvestigator.js';

const submission = {
  hypothesis: 'The unit tracks a prefix maximum.',
  restrictedRule: {
    op: 'prefixMax',
    value: { op: 'input', index: { op: 'time' } },
  },
  causalEvidence: 'not tested',
  causalInterventionResult: { schemaVersion: 1, status: 'not-tested' },
  evidence: ['A bounded synthetic observation.'],
};

/**
 *
 * @param inputTokens
 * @param outputTokens
 */
/**
 * @param {number} inputTokens Input token usage.
 * @param {number} outputTokens Output token usage.
 * @returns {Record<string, number>} JSONL usage record.
 */
function usageRecord(inputTokens, outputTokens) {
  return Object.fromEntries([
    ['input_tokens', inputTokens],
    ['output_tokens', outputTokens],
  ]);
}

/**
 * Build one successful Codex JSONL turn.
 * @param {Array<Record<string, any>>} [events] Additional process events.
 * @param {string} [answerText] Serialized answer content.
 * @param {Record<string, any>|null} [usage] Reported usage object.
 * @param {number} [turnCount] Number of completed turn events.
 * @returns {string} Serialized Codex event stream.
 */
function codexOutput(
  events = [],
  answerText = JSON.stringify(submission),
  usage = usageRecord(24, 9),
  turnCount = 1
) {
  return [
    {
      type: 'thread.started',
      ...Object.fromEntries([['thread_id', 'thread-test']]),
    },
    { type: 'turn.started' },
    ...events,
    {
      type: 'item.completed',
      item: {
        id: 'answer',
        type: 'agent_message',
        text: answerText,
      },
    },
    ...Array.from({ length: turnCount }, () => ({
      type: 'turn.completed',
      usage,
    })),
  ]
    .map(event => JSON.stringify(event))
    .join('\n');
}

/** @typedef {EventEmitter & {stdin: PassThrough, stdout: PassThrough, kill: (signal: string) => boolean}} MockCodexChild */

/**
 * Create a child-process test double.
 * @param {string|null} stdout JSONL stream, or null to keep it open.
 * @param {number} [exitCode] Child exit code.
 * @param {boolean} [autoClose] Whether to close on the next event-loop turn.
 * @param {string|null} [processSignal] Child termination signal.
 * @returns {MockCodexChild} Controllable child process.
 */
function createChild(
  stdout,
  exitCode = 0,
  autoClose = true,
  processSignal = null
) {
  const child = /** @type {MockCodexChild} */ (new EventEmitter());
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.kill = jest.fn(() => {
    queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
    return true;
  });
  if (autoClose) {
    setImmediate(() => {
      if (stdout !== null) child.stdout.end(stdout);
      child.emit('close', exitCode, processSignal);
    });
  }
  return child;
}

/**
 * Build a harness request that includes a held-out sentinel the adapter must omit.
 * @param {AbortSignal} [signal] Deadline signal.
 * @returns {Record<string, any>} Adapter request and reservation records.
 */
function createRequest(signal = new AbortController().signal) {
  const settlements = [];
  const request = {
    session: {
      sessionId: 'pair-01-control',
      pairId: 'pair-01',
      pairOrder: 0,
      unitIndex: 3,
      arm: 'control',
      budget: {
        investigatorTokens: 20000,
        elapsedMillis: 1800000,
        toolCalls: 100,
        targetForwardPasses: 10000,
      },
      investigatorRuntimeConfiguration: {
        provider: 'codex-cli',
        cliVersion: 'codex-cli 0.139.0',
        requestedModelIdentifier: 'codex-cli-test',
        reportedModelIdentifier: null,
        observedAt: '2026-10-24T10:00:00.000Z',
      },
    },
    mapEntries: [],
    fixtureSha256: 'a'.repeat(64),
    signal,
    budget: {
      reserve: limits => {
        settlements.push({ type: 'reserve', limits });
        return {
          complete: actual => settlements.push({ type: 'complete', actual }),
          cancel: () => settlements.push({ type: 'cancel' }),
        };
      },
    },
    heldOutEvaluationData: { secret: 'held-out-secret' },
    settlements,
  };
  return request;
}

/**
 * Build the adapter with in-memory filesystem and process dependencies.
 * @param {(...args: Array<any>) => MockCodexChild} spawnImpl Mocked child-process factory.
 * @param {Record<string, any>} [overrides] Options for a failure-path test.
 * @returns {{adapter: ReturnType<typeof createAlgZooCodexInvestigator>, files: Map<string, any>, removed: string[]}} Test adapter and observed effects.
 */
function createAdapter(spawnImpl, overrides = {}) {
  const files = new Map();
  const removed = [];
  const adapter = createAlgZooCodexInvestigator({
    cliVersion: 'codex-cli 0.139.0',
    tempDirectory: '/private-tmp',
    environment: {
      PATH: '/bin',
      HOME: '/private-home',
      CODEX_HOME: '/private-codex-home',
      OPENAI_API_KEY: 'must-not-be-forwarded',
    },
    spawnImpl,
    mkdtempImpl: async () => '/private-tmp/algzoo-session',
    writeFileImpl: async (filePath, contents, options) => {
      files.set(filePath, { contents, options });
    },
    rmImpl: async directory => removed.push(directory),
    ...overrides,
  });
  return { adapter, files, removed };
}

describe('AlgZoo Codex investigator adapter', () => {
  test('uses a private ephemeral sandbox and meters JSONL usage without exposing held-out data', async () => {
    const request = createRequest();
    const child = createChild(
      codexOutput([
        {
          type: 'item.started',
          item: { id: 'message-1', type: 'agent_message' },
        },
        { type: 'item.started', item: { id: 'missing-type' } },
        {
          type: 'item.started',
          item: { id: 'tool-1', type: 'command_execution', command: 'inspect' },
        },
      ])
    );
    const calls = [];
    const { adapter, files, removed } = createAdapter((...args) => {
      calls.push(args);
      return child;
    });

    const result = await adapter.runInvestigator(request);
    const [command, args, spawnOptions] = calls[0];
    const inputFile = files.get('/private-tmp/algzoo-session/input.json');

    expect(command).toBe('codex');
    expect(args).toContain('--ephemeral');
    expect(args).toContain('--json');
    expect(args).toContain('--sandbox');
    expect(args).toContain('workspace-write');
    expect(args).toContain('--output-schema');
    expect(args).toContain('-');
    expect(
      args.slice(args.indexOf('--model'), args.indexOf('--model') + 2)
    ).toEqual(['--model', 'codex-cli-test']);
    expect(args).not.toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(spawnOptions.cwd).toBe('/private-tmp/algzoo-session');
    expect(spawnOptions.env).toEqual({
      PATH: '/bin',
      HOME: '/private-home',
      CODEX_HOME: '/private-codex-home',
    });
    expect(inputFile.options).toEqual({ mode: 0o600 });
    expect(inputFile.contents).not.toContain('held-out-secret');
    expect(
      JSON.parse(inputFile.contents).session.investigatorRuntimeConfiguration
    ).toMatchObject({
      requestedModelIdentifier: 'codex-cli-test',
      reportedModelIdentifier: null,
    });
    expect(request.settlements[0]).toEqual({
      type: 'reserve',
      limits: { investigatorTokens: 20000, toolCalls: 100 },
    });
    expect(request.settlements[1]).toEqual({
      type: 'complete',
      actual: { investigatorTokens: 33, toolCalls: 1 },
    });
    expect(result.submission).toEqual(submission);
    expect(result.cost).toEqual(
      expect.objectContaining({
        investigatorTokens: 33,
        toolCalls: 1,
        targetForwardPasses: 0,
      })
    );
    expect(result.codexUsage).toEqual({ inputTokens: 24, outputTokens: 9 });
    expect(result.investigatorRuntime).toEqual(
      expect.objectContaining({
        provider: 'codex-cli',
        cliVersion: 'codex-cli 0.139.0',
        requestedModelIdentifier: 'codex-cli-test',
        reportedModelIdentifier: null,
        modelIdentifierStatus: 'not-reported-by-cli-jsonl',
        runtimeIdentityObservedAt: '2026-10-24T10:00:00.000Z',
        inputTokens: 24,
        outputTokens: 9,
        toolCalls: 1,
      })
    );
    expect(removed).toEqual(['/private-tmp/algzoo-session']);
  });

  test('settles the reservation and removes the workspace when JSONL is malformed', async () => {
    const request = createRequest();
    const { adapter, removed } = createAdapter(() => createChild('{broken'));

    await expect(adapter.runInvestigator(request)).rejects.toThrow(
      'malformed JSONL'
    );
    expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    expect(removed).toEqual(['/private-tmp/algzoo-session']);
  });

  test('kills the child on deadline abort and does not retain an unsettled reservation', async () => {
    const controller = new AbortController();
    const request = createRequest(controller.signal);
    const child = createChild(null, 0, false);
    const { adapter, removed } = createAdapter(() => child);
    const execution = adapter.runInvestigator(request);
    await new Promise(resolve => setImmediate(resolve));
    controller.abort();

    await expect(execution).rejects.toThrow('aborted');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    expect(removed).toEqual(['/private-tmp/algzoo-session']);
  });

  test('requires an observed Codex CLI version', () => {
    expect(() =>
      createAdapter(() => createChild(''), { cliVersion: '  ' })
    ).toThrow('observed Codex CLI version');
  });

  test('rejects incomplete requests before reserving or making runtime effects', async () => {
    const { adapter } = createAdapter(() => createChild(codexOutput()));
    const validRequest = createRequest();
    const invalidRequests = [
      undefined,
      {},
      { ...validRequest, session: { ...validRequest.session, sessionId: 1 } },
      {
        ...validRequest,
        session: {
          ...validRequest.session,
          investigatorRuntimeConfiguration: undefined,
        },
      },
      {
        ...validRequest,
        session: {
          ...validRequest.session,
          investigatorRuntimeConfiguration: {
            ...validRequest.session.investigatorRuntimeConfiguration,
            cliVersion: 'unmatched-cli-version',
          },
        },
      },
      { ...validRequest, mapEntries: null },
      { ...validRequest, fixtureSha256: null },
      { ...validRequest, budget: null },
      { ...validRequest, signal: {} },
    ];

    for (const request of invalidRequests) {
      await expect(adapter.runInvestigator(request)).rejects.toThrow(
        'bounded AlgZoo investigator request'
      );
    }
    expect(validRequest.settlements).toEqual([]);
  });

  test('cancels a request that is already aborted before workspace creation', async () => {
    const controller = new AbortController();
    controller.abort();
    const request = createRequest(controller.signal);
    const { adapter, removed } = createAdapter(() => createChild(''));

    await expect(adapter.runInvestigator(request)).rejects.toThrow('aborted');
    expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    expect(removed).toEqual([]);
  });

  test('settles errors for failed process status and invalid structured answers', async () => {
    const failedProcessRequest = createRequest();
    const failedProcess = createAdapter(() =>
      createChild(codexOutput(), 1)
    ).adapter;
    await expect(
      failedProcess.runInvestigator(failedProcessRequest)
    ).rejects.toThrow('process failed');

    for (const answerText of [
      '',
      JSON.stringify({ hypothesis: 'partial' }),
      '[]',
    ]) {
      const request = createRequest();
      const adapter = createAdapter(() =>
        createChild(codexOutput([], answerText))
      ).adapter;
      await expect(adapter.runInvestigator(request)).rejects.toThrow(
        answerText === '' ? 'no structured submission' : 'invalid shape'
      );
      expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    }
  });

  test('rejects failed, missing, duplicate, and invalid-usage JSONL events', async () => {
    const cases = [
      [codexOutput([{ type: 'turn.failed' }]), 'complete exactly one turn'],
      [
        codexOutput([], JSON.stringify(submission), undefined, 0),
        'complete exactly one turn',
      ],
      [
        codexOutput([], JSON.stringify(submission), undefined, 2),
        'complete exactly one turn',
      ],
      [
        codexOutput([], JSON.stringify(submission), null),
        'token usage is unavailable',
      ],
      [
        codexOutput([], JSON.stringify(submission), []),
        'token usage is unavailable',
      ],
      [
        codexOutput([], JSON.stringify(submission), usageRecord(-1, 0)),
        'token usage is unavailable',
      ],
      [codexOutput([{ type: 'error' }]), 'complete exactly one turn'],
    ];
    for (const [stdout, error] of cases) {
      const request = createRequest();
      const adapter = createAdapter(() => createChild(stdout)).adapter;
      await expect(adapter.runInvestigator(request)).rejects.toThrow(error);
      expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    }
  });

  test('cleans up when workspace creation fails', async () => {
    const request = createRequest();
    const { adapter, removed } = createAdapter(() => createChild(''), {
      mkdtempImpl: async () => {
        throw new Error('temporary storage unavailable');
      },
    });

    await expect(adapter.runInvestigator(request)).rejects.toThrow(
      'temporary storage unavailable'
    );
    expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    expect(removed).toEqual([]);
  });

  test('accepts an explicit executable and rejects a signalled child exit', async () => {
    const { adapter } = createAdapter(() => createChild(codexOutput()), {
      command: '/opt/codex/bin/codex',
    });
    const command = jest.fn(() =>
      createChild(codexOutput(), 0, true, 'SIGTERM')
    );
    const signalledAdapter = createAdapter(command).adapter;

    await expect(
      adapter.runInvestigator(createRequest())
    ).resolves.toMatchObject({
      status: 'submitted',
    });
    await expect(
      signalledAdapter.runInvestigator(createRequest())
    ).rejects.toThrow('process failed');
    expect(command).toHaveBeenCalledWith(
      'codex',
      expect.any(Array),
      expect.objectContaining({ cwd: '/private-tmp/algzoo-session' })
    );
  });

  test('cancels on a child spawn error and removes the private workspace', async () => {
    const request = createRequest();
    const child = createChild(null, 0, false);
    const { adapter, removed } = createAdapter(() => {
      setImmediate(() => child.emit('error', new Error('spawn failed')));
      return child;
    });

    await expect(adapter.runInvestigator(request)).rejects.toThrow(
      'spawn failed'
    );
    expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    expect(removed).toEqual(['/private-tmp/algzoo-session']);
  });

  test('terminates an oversized JSONL stream and clears the force-kill timer', async () => {
    const request = createRequest();
    const child = createChild(`${'x'.repeat(10 * 1024 * 1024 + 1)}`, 0, false);
    const timer = { unref: jest.fn() };
    const clearTimeoutImpl = jest.fn();
    const { adapter, removed } = createAdapter(
      () => {
        setImmediate(() => {
          child.stdout.write('x'.repeat(10 * 1024 * 1024 + 1));
          child.stdout.end('extra');
        });
        return child;
      },
      {
        setTimeoutImpl: callback => {
          callback();
          return timer;
        },
        clearTimeoutImpl,
      }
    );

    await expect(adapter.runInvestigator(request)).rejects.toThrow(
      'output exceeded its limit'
    );
    expect(child.kill.mock.calls.map(([signal]) => signal)).toEqual([
      'SIGTERM',
      'SIGKILL',
    ]);
    expect(timer.unref).toHaveBeenCalledTimes(1);
    expect(clearTimeoutImpl).toHaveBeenCalledWith(timer);
    expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    expect(removed).toEqual(['/private-tmp/algzoo-session']);
  });

  test('cancels if the signal becomes aborted while the process is spawned', async () => {
    const controller = new AbortController();
    const request = createRequest(controller.signal);
    const child = createChild(null, 0, false);
    const timer = { unref: jest.fn() };
    const { adapter, removed } = createAdapter(
      () => {
        controller.abort();
        return child;
      },
      { setTimeoutImpl: () => timer }
    );

    await expect(adapter.runInvestigator(request)).rejects.toThrow('aborted');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(request.settlements.at(-1)).toEqual({ type: 'cancel' });
    expect(removed).toEqual(['/private-tmp/algzoo-session']);
  });

  test('does not cancel a reservation after completion has already settled', async () => {
    const request = createRequest();
    let timestampCalls = 0;
    const { adapter } = createAdapter(() => createChild(codexOutput()), {
      timestampNowImpl: () => {
        timestampCalls += 1;
        if (timestampCalls === 2) throw new Error('completion clock failed');
        return '2026-10-24T00:00:00.000Z';
      },
    });

    await expect(adapter.runInvestigator(request)).rejects.toThrow(
      'completion clock failed'
    );
    expect(request.settlements.map(event => event.type)).toEqual([
      'reserve',
      'complete',
    ]);
  });
});
