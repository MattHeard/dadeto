import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockSave, mockFile, mockBucket } from '@google-cloud/storage';
import { mockDoc } from 'firebase-admin/firestore';
import { render } from '../../infra/cloud-functions/render-variant/index.js';

/**
 *
 * @param optionData
 */
function createSnap(optionData) {
  const optionsDocs = optionData.map(d => ({ data: () => d }));
  const optionsCollection = {
    get: jest.fn().mockResolvedValue({ docs: optionsDocs }),
  };
  const rootPageRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ number: 1 }),
    }),
  };
  const storyRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ rootPage: rootPageRef, title: 'Story' }),
    }),
  };
  const pagesCollection = { parent: storyRef };
  const pageRef = { parent: pagesCollection };
  const pageSnap = {
    exists: true,
    data: () => ({ number: 5, incomingOption: true }),
    ref: pageRef,
  };
  pageRef.get = jest.fn().mockResolvedValue(pageSnap);
  const variantsCollection = {
    get: jest.fn().mockResolvedValue({ docs: [] }),
    parent: pageRef,
  };
  return {
    data: () => ({ name: 'a', content: 'content', incomingOption: false }),
    ref: {
      path: 'stories/s1/pages/p5/variants/v1',
      parent: variantsCollection,
      collection: jest.fn(() => optionsCollection),
    },
  };
}

describe('render', () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockFile.mockClear();
    mockBucket.mockClear();
    mockDoc.mockReset();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: true });
  });

  test('sets cache control when variant open', async () => {
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    expect(mockSave.mock.calls[0][1]).toMatchObject({
      contentType: 'text/html',
      metadata: { cacheControl: 'no-store' },
    });
  });

  test('omits cache control when variant closed', async () => {
    const snap = createSnap([
      { content: 'Go', position: 0, targetPageNumber: 2 },
    ]);
    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    expect(mockSave.mock.calls[0][1]).toEqual({ contentType: 'text/html' });
  });

  test('logs error when cache invalidation fails', async () => {
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ ok: false, status: 500 });

    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test('invalidates parent variant when incoming option', async () => {
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    snap.data = () => ({
      name: 'a',
      content: 'content',
      incomingOption: 'stories/s1/pages/p1/variants/pv/options/o1',
    });

    const parentPageRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 2 }),
      }),
    };
    const parentVariantRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ name: 'b' }),
      }),
      parent: { parent: parentPageRef },
    };
    mockDoc.mockReturnValue({ parent: { parent: parentVariantRef } });

    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });

    const pathCalls = fetch.mock.calls
      .slice(1)
      .map(([, opts]) => JSON.parse(opts.body).path);
    expect(pathCalls).toContain('/p/2b.html');
  });

  test('adds navigation links for non-root variant', async () => {
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    snap.data = () => ({
      name: 'a',
      content: 'content',
      incomingOption: 'stories/s1/pages/p1/variants/pv/options/o1',
    });

    const parentPageRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 7 }),
      }),
    };
    const parentVariantRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ name: 'b' }),
      }),
      parent: { parent: parentPageRef },
    };
    mockDoc.mockReturnValue({ parent: { parent: parentVariantRef } });

    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    const html = mockSave.mock.calls[0][0];
    expect(html).toContain('<a href="/p/7b.html">Back</a>');
    expect(html).toContain('<a href="/p/1a.html">First page</a>');
  });
});
