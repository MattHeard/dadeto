import { jest } from '@jest/globals';
import { createJsonExpressAppDeps } from '../../../src/core/local/express-app-deps.js';

test('adapts the Express module without changing its parser references', () => {
  const express = jest.fn();
  express.json = jest.fn();
  express.urlencoded = jest.fn();

  const deps = createJsonExpressAppDeps(express);

  expect(deps.json).toBe(express.json);
  expect(deps.urlencoded).toBe(express.urlencoded);
  expect(deps.createApp()).toBeUndefined();
  expect(express).toHaveBeenCalledTimes(1);
});
