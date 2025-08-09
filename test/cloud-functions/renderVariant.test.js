import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockSave, mockFile, mockBucket } from '@google-cloud/storage';
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
  const pageRef = {};
  const pageSnap = {
    exists: true,
    data: () => ({ number: 1, incomingOption: true }),
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
      path: 'stories/s1/pages/p1/variants/v1',
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
});
