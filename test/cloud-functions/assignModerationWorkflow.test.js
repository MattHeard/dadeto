import { describe, expect, it, jest } from '@jest/globals';
import { createAssignModerationWorkflow } from '../../src/cloud/assign-moderation-job/assign-moderation-job-core.js';

describe('createAssignModerationWorkflow', () => {
  const request = { method: 'POST' };

  it('returns guard failures without invoking assignment', async () => {
    const runGuards = jest.fn().mockResolvedValue({
      error: { status: 401, body: 'Nope' },
    });
    const assign = jest.fn();
    const workflow = createAssignModerationWorkflow(runGuards, assign);

    await expect(workflow({ req: request })).resolves.toEqual({
      status: 401,
      body: 'Nope',
    });
    expect(assign).not.toHaveBeenCalled();
  });

  it('passes the authenticated user to the assignment operation', async () => {
    const runGuards = jest.fn().mockResolvedValue({
      context: { userRecord: { uid: 'moderator-2' } },
    });
    const assign = jest.fn().mockResolvedValue(undefined);
    const workflow = createAssignModerationWorkflow(runGuards, assign);

    await expect(workflow({ req: request })).resolves.toEqual({
      status: 201,
      body: '',
    });
    expect(runGuards).toHaveBeenCalledWith({ req: request });
    expect(assign).toHaveBeenCalledWith('moderator-2');
  });

  it('normalizes assignment response errors', async () => {
    const runGuards = jest.fn().mockResolvedValue({
      context: { userRecord: { uid: 'moderator-1' } },
    });
    const assign = jest
      .fn()
      .mockRejectedValue({ status: 500, body: 'Variant fetch failed' });
    const workflow = createAssignModerationWorkflow(runGuards, assign);

    await expect(workflow({ req: request })).resolves.toEqual({
      status: 500,
      body: 'Variant fetch failed',
    });
  });

  it('returns an error when the user record is missing', async () => {
    const assign = jest.fn();
    const workflow = createAssignModerationWorkflow(
      jest.fn().mockResolvedValue({ context: {} }),
      assign
    );

    await expect(workflow({ req: request })).resolves.toEqual({
      status: 500,
      body: 'Moderator lookup failed',
    });
    expect(assign).not.toHaveBeenCalled();
  });
});
