import { jest } from '@jest/globals';

await jest.unstable_mockModule(
  '../../../src/cloud/render-contents/firebase-functions.js',
  () => ({ default: {} })
);
await jest.unstable_mockModule(
  '../../../src/cloud/render-contents/common-gcf.js',
  () => ({
    fetchFn: jest.fn(),
    createFirebaseAppManager: jest.fn(),
    crypto: {},
    getEnvironmentVariables: jest.fn(),
  })
);
await jest.unstable_mockModule('../../../src/cloud/allow-effects.js', () => ({
  createEffectInvocationBoundary: jest.fn(),
}));
await jest.unstable_mockModule('@google-cloud/storage', () => ({
  Storage: class Storage {},
}));
await jest.unstable_mockModule('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));
await jest.unstable_mockModule(
  '../../../src/cloud/render-contents/firestore.js',
  () => ({
    getFirestoreInstance: jest.fn(),
  })
);
await jest.unstable_mockModule(
  '../../../src/cloud/render-contents/common-core.js',
  () => ({
    ADMIN_UID: 'admin',
  })
);

const { createSaveRenderedPage } = await import(
  '../../../src/cloud/render-contents/render-contents-gcf.js'
);

describe('render-contents effect adapters', () => {
  it('saves the rendered HTML through the permission-first adapter', async () => {
    const permission = Object.freeze({ render: 'allowed' });
    const save = jest.fn().mockResolvedValue(undefined);
    const bucket = { file: jest.fn(() => ({ save })) };
    const storage = { bucket: jest.fn(() => bucket) };

    const saveRenderedPage = createSaveRenderedPage(storage, 'static-bucket');

    await saveRenderedPage(
      permission,
      'tenant/index.html',
      '<main>Contents</main>',
      { contentType: 'text/html' }
    );

    expect(storage.bucket).toHaveBeenCalledWith('static-bucket');
    expect(bucket.file).toHaveBeenCalledWith('tenant/index.html');
    expect(save).toHaveBeenCalledWith('<main>Contents</main>', {
      contentType: 'text/html',
    });
  });
});
