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
 * @template Options
 * @param {(options: Options) => () => Promise<void>} factory Runner factory.
 * @returns {(options: Options) => () => Promise<void>} Fixture factory.
 */
export function boundedWorktreeFactory(factory) {
  return options => {
    const handle = factory(options);
    return () => completeWorktreeOperation(handle());
  };
}
