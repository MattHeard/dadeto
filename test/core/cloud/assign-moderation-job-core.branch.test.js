import { jest } from '@jest/globals';
import { assignModerationJobTestUtils } from '../../../src/core/cloud/assign-moderation-job/assign-moderation-job-core.js';

describe('assignModerationJobTestUtils', () => {
  test('hasTokenMessage recognizes string property', () => {
    const result = assignModerationJobTestUtils.hasTokenMessage({ message: 'Oops' });
    expect(result).toBe(true);
  });

  test('hasTokenMessage returns false for non-object', () => {
    expect(assignModerationJobTestUtils.hasTokenMessage('oops')).toBe(false);
  });

  test('createEnsureValidIdToken returns guard error when missing id token', async () => {
    const guard = assignModerationJobTestUtils.createEnsureValidIdToken({ verifyIdToken: jest.fn() });
    const outcome = await guard({});
    expect(outcome.error?.status).toBe(401);
  });

  test('createEnsureUserRecord errors when decoded token missing', async () => {
    const guard = assignModerationJobTestUtils.createEnsureUserRecord({ getUser: jest.fn() });
    const outcome = await guard({});
    expect(outcome.error?.status).toBe(401);
  });

  test('buildCorsOptions enforces POST method', () => {
    const corsFn = () => null;
    const handler = () => null;
    const options = assignModerationJobTestUtils.buildCorsOptions(handler, { allowedOrigins: ['https://example.com'] });
    expect(options.methods).toEqual(['POST']);
  });

  test('buildCorsOptions defaults allowed origins when missing', () => {
    const handler = () => null;
    const options = assignModerationJobTestUtils.buildCorsOptions(handler, {});
    expect(Array.isArray(options.origin)).toBe(false);
    expect(options.origin).toBeDefined();
  });

  test('ensureSnapshot provides empty marker when missing', () => {
    expect(assignModerationJobTestUtils.ensureSnapshot(undefined)).toEqual({ empty: true });
  });

  test('resolveContextFromResult prefers guard context when present', () => {
    const context = { foo: 'bar' };
    expect(assignModerationJobTestUtils.resolveContextFromResult(context, { foo: 'baz' })).toBe(context);
  });

  test('resolveContextFromResult falls back when guard context missing', () => {
    const fallback = { foo: 'baz' };
    expect(assignModerationJobTestUtils.resolveContextFromResult(undefined, fallback)).toBe(fallback);
  });

  test('ensureVariantDocAvailability throws when variant missing', () => {
    expect(() => assignModerationJobTestUtils.ensureVariantDocAvailability(undefined, undefined)).toThrow();
  });

  test('isResponse rejects objects without status', () => {
    expect(assignModerationJobTestUtils.isResponse({})).toBe(false);
  });

  test('isResponse rejects non-objects', () => {
    expect(assignModerationJobTestUtils.isResponse(null)).toBe(false);
  });
});
