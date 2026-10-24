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
 * Build one successful Codex JSONL turn.
 * @param {Array<Record<string, any>>} [events] Additional process events.
 * @returns {string} Serialized Codex event stream.
 */
function codexOutput(events = []) {
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
        text: JSON.stringify(submission),
      },
    },
    {
      type: 'turn.completed',
      usage: Object.fromEntries([
        ['input_tokens', 24],
        ['output_tokens', 9],
      ]),
    },
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
 * @returns {MockCodexChild} Controllable child process.
 */
function createChild(stdout, exitCode = 0, autoClose = true) {
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
      child.emit('close', exitCode, null);
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
      investigatorModel: 'codex-cli-test',
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
 * @returns {{adapter: ReturnType<typeof createAlgZooCodexInvestigator>, files: Map<string, any>, removed: string[]}} Test adapter and observed effects.
 */
function createAdapter(spawnImpl) {
  const files = new Map();
  const removed = [];
  const adapter = createAlgZooCodexInvestigator({
    model: 'gpt-5.4-mini',
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
    expect(args).not.toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(spawnOptions.cwd).toBe('/private-tmp/algzoo-session');
    expect(spawnOptions.env).toEqual({
      PATH: '/bin',
      HOME: '/private-home',
      CODEX_HOME: '/private-codex-home',
    });
    expect(inputFile.options).toEqual({ mode: 0o600 });
    expect(inputFile.contents).not.toContain('held-out-secret');
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
        model: 'gpt-5.4-mini',
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
});
