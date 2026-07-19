import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { acquireJestSlot } from '../../scripts/jest-pool.js';

describe('Jest pool', () => {
  test('queues a second requester until the first releases', async () => {
    const poolDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-jest-pool-'));
    const first = await acquireJestSlot({
      poolDir,
      pid: 1001,
      isProcessAlive: pid => pid === 1001,
    });
    let secondAcquired = false;
    const secondPromise = acquireJestSlot({
      poolDir,
      pid: 1002,
      pollMs: 1,
      isProcessAlive: pid => pid === 1001,
    }).then(release => {
      secondAcquired = true;
      return release;
    });
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(secondAcquired).toBe(false);
    first();
    const second = await secondPromise;
    expect(secondAcquired).toBe(true);
    second();
    fs.rmSync(poolDir, { recursive: true, force: true });
  });

  test('recovers a stale owner', async () => {
    const poolDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-jest-pool-'));
    fs.mkdirSync(path.join(poolDir, 'active'));
    fs.writeFileSync(
      path.join(poolDir, 'active', 'owner.json'),
      JSON.stringify({ pid: 1001 })
    );
    const release = await acquireJestSlot({
      poolDir,
      pid: 1002,
      isProcessAlive: () => false,
    });
    expect(
      JSON.parse(
        fs.readFileSync(path.join(poolDir, 'active', 'owner.json'), 'utf8')
      ).pid
    ).toBe(1002);
    release();
    fs.rmSync(poolDir, { recursive: true, force: true });
  });

  test('times out with a useful error', async () => {
    const poolDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-jest-pool-'));
    const release = await acquireJestSlot({
      poolDir,
      pid: 1001,
      isProcessAlive: () => true,
    });
    await expect(
      acquireJestSlot({
        poolDir,
        pid: 1002,
        pollMs: 1,
        timeoutMs: 2,
        isProcessAlive: () => true,
      })
    ).rejects.toThrow('shared Jest slot');
    release();
    fs.rmSync(poolDir, { recursive: true, force: true });
  });
});
