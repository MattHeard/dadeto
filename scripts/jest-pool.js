import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_POOL_DIR = path.join(os.tmpdir(), 'dadeto-jest-pool');
const DEFAULT_POLL_MS = 250;

/**
 * Acquire the machine-wide Jest slot.
 * @param {{ poolDir?: string, pid?: number, cwd?: string, command?: string, pollMs?: number, timeoutMs?: number, mkdirSync?: Function, writeFileSync?: Function, readFileSync?: Function, rmSync?: Function, existsSync?: Function, isProcessAlive?: Function, sleep?: Function, now?: Function }} options
 * @returns {Promise<() => void>} Release function.
 */
export async function acquireJestSlot(options = {}) {
  const poolDir = options.poolDir ?? process.env.DADETO_JEST_POOL_DIR ?? DEFAULT_POOL_DIR;
  const lockDir = path.join(poolDir, 'active');
  const ownerFile = path.join(lockDir, 'owner.json');
  const mkdirSync = options.mkdirSync ?? fs.mkdirSync;
  const writeFileSync = options.writeFileSync ?? fs.writeFileSync;
  const readFileSync = options.readFileSync ?? fs.readFileSync;
  const rmSync = options.rmSync ?? fs.rmSync;
  const existsSync = options.existsSync ?? fs.existsSync;
  const isProcessAlive = options.isProcessAlive ?? isPidAlive;
  const sleep = options.sleep ?? delay;
  const pollMs = options.pollMs ?? Number(process.env.DADETO_JEST_POOL_POLL_MS ?? DEFAULT_POLL_MS);
  const timeoutMs = options.timeoutMs ?? Number(process.env.DADETO_JEST_POOL_TIMEOUT_MS ?? 0);
  const startedAt = options.now?.() ?? Date.now();
  const owner = {
    pid: options.pid ?? process.pid,
    cwd: options.cwd ?? process.cwd(),
    command: options.command ?? process.argv.join(' '),
    startedAt,
  };

  mkdirSync(poolDir, { recursive: true });
  while (true) {
    try {
      mkdirSync(lockDir);
      writeFileSync(ownerFile, JSON.stringify(owner));
      return () => rmSync(lockDir, { recursive: true, force: true });
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      if (isStaleOwner(ownerFile, existsSync, readFileSync, isProcessAlive)) {
        rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      if (timeoutMs > 0 && (options.now?.() ?? Date.now()) - startedAt >= timeoutMs) {
        throw new Error(`Timed out waiting for the shared Jest slot in ${poolDir}.`);
      }
      await sleep(pollMs);
    }
  }
}

function isStaleOwner(ownerFile, existsSync, readFileSync, isProcessAlive) {
  if (!existsSync(ownerFile)) return true;
  try {
    const owner = JSON.parse(readFileSync(ownerFile, 'utf8'));
    return !Number.isInteger(owner.pid) || !isProcessAlive(owner.pid);
  } catch {
    return true;
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
