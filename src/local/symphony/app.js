import express from 'express';
import { bindEffectBoundary } from '../allow-effects.js';
import { createSymphonyAppHandle } from '../../core/local/symphony/app.js';
import { refreshSymphonyStatus } from './bootstrap.js';

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === 'object') {
      if (error.code === 'ESRCH') {
        return false;
      }
      if (error.code === 'EPERM') {
        return true;
      }
    }

    throw error;
  }
}

const handle = createSymphonyAppHandle({
  express,
  refreshSymphonyStatus,
  isProcessAlive,
  bindEffectBoundary,
});

export const {
  createSymphonyStatusHandler,
  createSymphonyLaunchHandler,
  createSymphonyRefreshHandler,
  createSymphonyApp,
} = handle;

export { handle };
