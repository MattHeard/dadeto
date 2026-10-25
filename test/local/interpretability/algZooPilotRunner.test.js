import { describe, expect, it, jest } from '@jest/globals';
import { createAlgZooPilotSchedule } from '../../../src/core/interpretability/algZooPilotHarness/index.js';
import { createAuditedAlgZooPilotRunner } from '../../../src/local/interpretability/algZooPilotRunner.js';

/**
 * Build a synthetic two-arm pair runner without launching external work.
 * @param {Array<Record<string, any>>} events Captured fake-ledger writes.
 * @param {Record<string, any>} [overrides] Adapter replacements for failures.
 * @returns {ReturnType<typeof createAuditedAlgZooPilotRunner>} Test runner.
 */
function createRunner(events, overrides = {}) {
  const pair = {
    ...createAlgZooPilotSchedule(7).pairs[0],
    fixtureSha256: 'f'.repeat(64),
    sessions: Object.fromEntries(
      ['control', 'treatment'].map(arm => [
        arm,
        {
          ...createAlgZooPilotSchedule(7).pairs[0].sessions[arm],
          investigatorRuntimeConfiguration: {
            provider: 'codex-cli',
            requestedModelIdentifier: 'synthetic-test-model',
          },
        },
      ])
    ),
  };
  const adapters = {
    createDeadline: () => ({
      signal: { aborted: false },
      expired: new Promise(() => {}),
      elapsedMillis: () => 0,
      abort: jest.fn(),
      cancel: jest.fn(),
    }),
    hashMapSnapshot: async () => 'synthetic-map-hash',
    runInvestigator: async request => {
      const reservation = request.budget.reserve({ investigatorTokens: 1 });
      reservation.complete({ investigatorTokens: 1 });
      return {
        submission: {
          causalEvidence: 'not tested',
          causalInterventionResult: {
            schemaVersion: 1,
            status: 'not-tested',
          },
        },
      };
    },
    scoreBlindedSubmissions: async () => [
      {
        predictionStatus: 'scored',
        predictionMetrics: { normalizedRmse: 0.25 },
      },
      {
        predictionStatus: 'scored',
        predictionMetrics: { normalizedRmse: 0.5 },
      },
    ],
    validateCausalInterventionResult: () => true,
    ...overrides,
  };
  const ledger = {
    append: async (eventType, payload) => {
      events.push({ eventType, payload });
    },
  };
  return {
    pair,
    runner: createAuditedAlgZooPilotRunner(adapters, ledger),
  };
}

describe('local AlgZoo pilot runner', () => {
  it('persists lifecycle and blinded scores through the injected JSONL ledger', async () => {
    const events = [];
    const { pair, runner } = createRunner(events);
    await runner.runTargetPair(pair, [], [{ heldOutSentinel: 'private' }]);

    expect(events.map(event => event.eventType)).toEqual([
      'session-started',
      'session-finished',
      'session-started',
      'session-finished',
      'pair-scored',
    ]);
    expect(JSON.stringify(events)).not.toContain('heldOutSentinel');
    expect(events.at(-1).payload.scores).toHaveLength(2);
  });

  it('fails closed when the local ledger cannot append the session start', async () => {
    const events = [];
    const investigator = jest.fn(async () => ({}));
    const { pair } = createRunner(events);
    const ledgerError = new Error('synthetic ledger failure');
    const failingRunner = createAuditedAlgZooPilotRunner(
      {
        createDeadline: () => ({
          signal: { aborted: false },
          expired: new Promise(() => {}),
          elapsedMillis: () => 0,
          abort() {},
          cancel() {},
        }),
        hashMapSnapshot: async () => 'synthetic-map-hash',
        runInvestigator: investigator,
        scoreBlindedSubmissions: async () => [],
        validateCausalInterventionResult: () => true,
      },
      {
        append: async () => {
          throw ledgerError;
        },
      }
    );

    await expect(failingRunner.runTargetPair(pair, [], [])).rejects.toBe(
      ledgerError
    );
    expect(investigator).not.toHaveBeenCalled();
  });
});
