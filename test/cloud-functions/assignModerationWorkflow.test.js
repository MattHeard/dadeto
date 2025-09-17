import { describe, expect, it, jest } from '@jest/globals';
import { createAssignModerationWorkflow } from '../../infra/cloud-functions/assign-moderation-job/workflow.js';

describe('createAssignModerationWorkflow', () => {
  const request = { method: 'POST' };

  it('returns guard failure responses without invoking downstream steps', async () => {
    const runGuards = jest.fn().mockResolvedValue({
      error: { status: 401, body: 'Nope' },
    });
    const fetchVariantSnapshot = jest.fn();
    const selectVariantDoc = jest.fn();
    const buildAssignment = jest.fn();
    const createModeratorRef = jest.fn();
    const now = jest.fn();
    const random = jest.fn();

    const assignModerationWorkflow = createAssignModerationWorkflow({
      runGuards,
      fetchVariantSnapshot,
      selectVariantDoc,
      buildAssignment,
      createModeratorRef,
      now,
      random,
    });

    const response = await assignModerationWorkflow({ req: request });

    expect(response).toEqual({ status: 401, body: 'Nope' });
    expect(fetchVariantSnapshot).not.toHaveBeenCalled();
    expect(selectVariantDoc).not.toHaveBeenCalled();
    expect(buildAssignment).not.toHaveBeenCalled();
    expect(createModeratorRef).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it('returns an error when no variant can be selected', async () => {
    const runGuards = jest.fn().mockResolvedValue({
      context: { userRecord: { uid: 'moderator-1' } },
    });
    const fetchVariantSnapshot = jest.fn().mockResolvedValue({});
    const selectVariantDoc = jest
      .fn()
      .mockReturnValue({ errorMessage: 'Variant fetch failed' });
    const buildAssignment = jest.fn();
    const createModeratorRef = jest.fn();
    const now = jest.fn();
    const random = jest.fn().mockReturnValue(0.42);

    const assignModerationWorkflow = createAssignModerationWorkflow({
      runGuards,
      fetchVariantSnapshot,
      selectVariantDoc,
      buildAssignment,
      createModeratorRef,
      now,
      random,
    });

    const response = await assignModerationWorkflow({ req: request });

    expect(random).toHaveBeenCalledTimes(1);
    expect(fetchVariantSnapshot).toHaveBeenCalledWith(0.42);
    expect(selectVariantDoc).toHaveBeenCalledWith({});
    expect(createModeratorRef).not.toHaveBeenCalled();
    expect(buildAssignment).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    expect(response).toEqual({ status: 500, body: 'Variant fetch failed' });
  });

  it('returns an error when the user record is missing', async () => {
    const runGuards = jest.fn().mockResolvedValue({ context: {} });
    const fetchVariantSnapshot = jest.fn();
    const selectVariantDoc = jest.fn();
    const buildAssignment = jest.fn();
    const createModeratorRef = jest.fn();
    const now = jest.fn();
    const random = jest.fn();

    const assignModerationWorkflow = createAssignModerationWorkflow({
      runGuards,
      fetchVariantSnapshot,
      selectVariantDoc,
      buildAssignment,
      createModeratorRef,
      now,
      random,
    });

    const response = await assignModerationWorkflow({ req: request });

    expect(random).not.toHaveBeenCalled();
    expect(fetchVariantSnapshot).not.toHaveBeenCalled();
    expect(selectVariantDoc).not.toHaveBeenCalled();
    expect(createModeratorRef).not.toHaveBeenCalled();
    expect(buildAssignment).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    expect(response).toEqual({
      status: 500,
      body: 'Moderator lookup failed',
    });
  });

  it('persists the assignment when a variant is available', async () => {
    const runGuards = jest.fn().mockResolvedValue({
      context: { userRecord: { uid: 'moderator-2' } },
    });
    const fetchVariantSnapshot = jest
      .fn()
      .mockResolvedValue({ snapshot: true });
    const variantDoc = { ref: { path: 'variants/123' } };
    const selectVariantDoc = jest.fn().mockReturnValue({ variantDoc });
    const assignment = { variant: 'variants/123', createdAt: 'timestamp' };
    const buildAssignment = jest.fn().mockReturnValue(assignment);
    const set = jest.fn().mockResolvedValue(undefined);
    const createModeratorRef = jest.fn().mockReturnValue({ set });
    const now = jest.fn().mockReturnValue('timestamp');
    const random = jest.fn().mockReturnValue(0.84);

    const assignModerationWorkflow = createAssignModerationWorkflow({
      runGuards,
      fetchVariantSnapshot,
      selectVariantDoc,
      buildAssignment,
      createModeratorRef,
      now,
      random,
    });

    const response = await assignModerationWorkflow({ req: request });

    expect(random).toHaveBeenCalledTimes(1);
    expect(fetchVariantSnapshot).toHaveBeenCalledWith(0.84);
    expect(selectVariantDoc).toHaveBeenCalledWith({ snapshot: true });
    expect(createModeratorRef).toHaveBeenCalledWith('moderator-2');
    expect(now).toHaveBeenCalledTimes(1);
    expect(buildAssignment).toHaveBeenCalledWith(variantDoc.ref, 'timestamp');
    expect(set).toHaveBeenCalledWith(assignment);
    expect(response).toEqual({ status: 201, body: '' });
  });
});
