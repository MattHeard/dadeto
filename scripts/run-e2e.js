#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);

async function run(command, commandArgs) {
  const child = spawn(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code}`));
    });
  });
}

try {
  await run('npm', ['run', 'test:e2e:cloud', '--', ...args]);
  await run('npm', ['run', 'test:e2e:local', '--', ...args]);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
