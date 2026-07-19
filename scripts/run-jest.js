#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { acquireJestSlot } from './jest-pool.js';

const release = await acquireJestSlot({
  command: `jest ${process.argv.slice(2).join(' ')}`,
});
const jestPath = fileURLToPath(new URL('../node_modules/jest/bin/jest.js', import.meta.url));
const child = spawn(process.execPath, [jestPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --experimental-vm-modules`.trim() },
});

const finish = code => {
  release();
  process.exitCode = code ?? 1;
};
child.on('error', error => {
  release();
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', finish);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
    release();
  });
}
