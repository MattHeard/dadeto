import { spawn } from 'node:child_process';

const scanner = new URL('../../scripts/find-surviving-mutant-core.js', import.meta.url);
const child = spawn(process.execPath, [scanner.pathname], { stdio: 'inherit' });

await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`Mutant scanner exited with ${signal ?? `code ${code}`}`));
  });
});
