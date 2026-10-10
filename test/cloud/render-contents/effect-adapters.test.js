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
const { setHttpResponseHeader, sendHttpResponse, logRenderContentsError } =
  await import('../../../src/cloud/render-contents/response-effects.js');

describe('render-contents effect adapters', () => {
  it('writes response headers through the permission-first adapter', () => {
    const permission = Object.freeze({ response: 'allowed' });
    const response = { set: jest.fn() };

    setHttpResponseHeader(permission, response, 'Vary', 'Origin');

    expect(response.set).toHaveBeenCalledWith('Vary', 'Origin');
  });

  it('writes response status and JSON through the permission-first adapter', () => {
    const permission = Object.freeze({ response: 'allowed' });
    const json = jest.fn();
    const response = { status: jest.fn(() => ({ json })) };

    sendHttpResponse(permission, response, {
      status: 200,
      body: { ok: true },
      method: 'json',
    });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it('logs errors through the permission-first adapter', () => {
    const permission = Object.freeze({ log: 'allowed' });
    const error = new Error('invalidation failed');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});

    logRenderContentsError(permission, 'invalidation failed', error);

    expect(log).toHaveBeenCalledWith('invalidation failed', error);
    log.mockRestore();
  });

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
