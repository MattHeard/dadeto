import {
  adaptAllowEffectsBag,
  requireAllowEffects,
} from '../../src/adapters/allow-effects.js';
import { createWorktreeSpawn } from '../../src/adapters/worktree.js';
import { bindEffectBoundary } from '../../src/local/allow-effects.js';

/**
 * Require a controlled runner operation to settle before the mutation deadline.
 * @template T
 * @param {Promise<T>} operation Controlled operation.
 * @returns {Promise<T>} Original result, or a test-only completion failure.
 */
export async function completeWorktreeOperation(operation) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {Promise<never>} */
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Worktree operation did not settle')),
      2000
    );
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bound a fixture's runner handle without changing construction errors.
 * @param {Function} factory Runner factory.
 * @returns {(options: object) => () => Promise<void>} Fixture factory.
 */
export function boundedWorktreeFactory(factory) {
  return options => {
    const handle = factory({
      ...options,
      fsModule: adaptAllowEffectsBag(options.fsModule, {
        mkdtemp: 'effect',
        rm: 'effect',
        cp: 'effect',
        mkdir: 'effect',
        writeFile: 'effect',
        appendFile: 'effect',
      }),
      spawnImpl: createWorktreeSpawn(options.spawnImpl),
      log: options.log ? requireAllowEffects(options.log) : undefined,
      now: options.now ?? (() => '2026-10-27T00:00:00.000Z'),
      bindEffectBoundary,
    });
    return () => completeWorktreeOperation(handle());
  };
}

/**
 * Adapt a controlled process fixture to the permission-first command contract.
 * @param {Function} runner Core command runner.
 * @param {object} options Controlled command inputs.
 * @returns {Promise<void>} Bounded command result.
 */
export function boundedWorktreeCommand(runner, options) {
  return completeWorktreeOperation(
    bindEffectBoundary(permission =>
      runner(permission, {
        ...options,
        env: options.env ?? {},
        spawnImpl: createWorktreeSpawn(options.spawnImpl),
      })
    )
  );
}
