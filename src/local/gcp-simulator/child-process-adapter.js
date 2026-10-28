/**
 * Expose permission-first lifecycle operations for one native child process.
 * @param {import('node:child_process').ChildProcess} child Native child.
 * @returns {import('../../core/local/gcp-simulator/playwright-runner.js').RunnerChild} Child capabilities.
 */
export function createChildCapabilities(child) {
  return {
    status: _permission => ({exitCode: child.exitCode, signalCode: child.signalCode}),
    onceError: (_permission, listener) => child.once('error', listener),
    onceExit: (_permission, listener) => child.once('exit', listener),
    offError: (_permission, listener) => child.off('error', listener),
    offExit: (_permission, listener) => child.off('exit', listener),
    onStdout: (_permission, listener) => child.stdout?.on('data', listener),
    onStderr: (_permission, listener) => child.stderr?.on('data', listener),
    kill: (_permission, signal) => child.kill(signal),
  };
}
