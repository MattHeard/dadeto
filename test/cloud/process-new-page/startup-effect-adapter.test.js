import { describe, expect, it, jest } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import {
  createSubmissionBatch,
  updateSubmissionDocument,
} from '../../../src/cloud/process-new-page/effect-adapters.js';
import { getProcessNewPageStartupFirestore } from '../../../src/cloud/process-new-page/startup-effect-adapter.js';

describe('process-new-page startup effect adapter', () => {
  it('requires a capability before resolving the startup Firestore client', () => {
    const allowEffects = createAllowEffects();
    const getFirestoreInstance = jest.fn(() => ({ db: true }));
    expect(
      getProcessNewPageStartupFirestore(allowEffects, getFirestoreInstance)
    ).toEqual({ db: true });
    expect(getFirestoreInstance).toHaveBeenCalledWith();
  });

  it('keeps the startup boundary outside the registered trigger callback', async () => {
    const source = await readFile(
      'src/cloud/process-new-page/index.js',
      'utf8'
    );
    expect(source).toContain('createEffectStartupBoundary');
    expect(source).toContain('createEffectInvocationBoundary');
    expect(source).toContain(
      '})(updateSubmissionDocument)(createSubmissionBatch)'
    );
    expect(source).toContain(
      'getProcessNewPageStartupFirestore(allowEffects, getFirestoreInstance)'
    );
    expect(source).toContain(
      '.onCreate((snap, context) => handleProcessNewPage(snap, context))'
    );
  });

  it('forwards the trigger permission to the processed-marker write', async () => {
    const allowEffects = createAllowEffects();
    const update = jest.fn().mockResolvedValue(undefined);
    const document = { update };

    await updateSubmissionDocument(allowEffects, document, {
      processed: true,
    });

    expect(update).toHaveBeenCalledWith({ processed: true });
  });

  it('creates a trigger-scoped facade for batch writes and commit', async () => {
    const allowEffects = createAllowEffects();
    const batch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    const db = { batch: jest.fn(() => batch) };
    const facade = createSubmissionBatch(allowEffects, db);
    const reference = {};
    const data = { processed: true };

    facade.set(reference, data);
    facade.update(reference, data);
    await facade.commit();

    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(batch.set).toHaveBeenCalledWith(reference, data);
    expect(batch.update).toHaveBeenCalledWith(reference, data);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});
