import { describe, expect, it, jest } from '@jest/globals';
import { handle } from '../../../src/cloud/chronoflow-time/index.js';

/**
 * Create a response recorder.
 * @returns {object} Express-like response recorder.
 */
function createResponse() {
  const response = {
    status: jest.fn(() => response),
    set: jest.fn(() => response),
    json: jest.fn(() => response),
    send: jest.fn(() => response),
  };
  return response;
}

describe('Chronoflow time HTTP boundary', () => {
  it('sends the authoritative time through a per-request effect boundary', async () => {
    const response = createResponse();
    const before = Date.now();

    await handle({ method: 'GET' }, response);

    const after = Date.now();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      epochMs: expect.any(Number),
    });
    const [{ epochMs }] = response.json.mock.calls[0];
    expect(epochMs).toBeGreaterThanOrEqual(before);
    expect(epochMs).toBeLessThanOrEqual(after);
  });

  it('keeps OPTIONS and rejected methods on the same capability-aware boundary', async () => {
    const preflight = createResponse();
    await handle({ method: 'OPTIONS' }, preflight);
    expect(preflight.status).toHaveBeenCalledWith(204);
    expect(preflight.send).toHaveBeenCalledWith('');

    const rejected = createResponse();
    await handle({ method: 'POST' }, rejected);
    expect(rejected.status).toHaveBeenCalledWith(405);
    expect(rejected.set).toHaveBeenCalledWith('Allow', 'GET');
    expect(rejected.send).toHaveBeenCalledWith('Method not allowed');
  });
});
