#!/usr/bin/env node
import { spawn } from 'node:child_process';

const jestBin = './node_modules/.bin/jest';
const jestArgs = [
  '--coverage',
  '--watchman=false',
  '--maxWorkers=50%',
  ...process.argv.slice(2),
];

const child = spawn(process.execPath, [jestBin, ...jestArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: [
      process.env.NODE_OPTIONS,
      '--experimental-vm-modules',
    ]
      .filter(Boolean)
      .join(' '),
  },
});

child.on('exit', code => {
  if (code !== 0) {
    process.exitCode = code ?? 1;
    return;
  }

  import('../src/local/write-coverage-summary.js')
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
});
