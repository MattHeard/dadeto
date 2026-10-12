import { describe, expect, it, jest } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
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
    expect(source).toContain(
      'getProcessNewPageStartupFirestore(allowEffects, getFirestoreInstance)'
    );
    expect(source).toContain(
      '.onCreate((snap, context) => handleProcessNewPage(snap, context))'
    );
  });
});
