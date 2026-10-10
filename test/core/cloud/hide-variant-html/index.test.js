import { jest } from '@jest/globals';
import { createHideVariantHtmlCore } from '../../../../src/core/cloud/hide-variant-html/hide-variant-html-core.js';

const deleteStorageFile = jest.fn((...args) => {
  const [, storage, bucketName, path, options] = args;
  return storage.bucket(bucketName).file(path).delete(options);
});
const createEffectInvocationBoundary = handler => change =>
  handler(Object.freeze({}), change);

describe('createHideVariantHtmlCore', () => {
  test('wires the firestore trigger from injected dependencies', async () => {
    deleteStorageFile.mockClear();
    const onWrite = jest.fn(handler => ({ handler }));
    const document = jest.fn(() => ({ onWrite }));
    const region = jest.fn(() => ({ firestore: { document } }));
    const initializeApp = jest.fn(() => ({ app: true }));
    const storageFileDelete = jest.fn().mockResolvedValue(undefined);
    const storageBucket = jest.fn(() => ({
      file: () => ({ delete: storageFileDelete }),
    }));
    const Storage = jest.fn(() => ({ bucket: storageBucket }));
    const pageRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 12 }),
      }),
    };
    const db = { doc: jest.fn(() => pageRef) };

    const { hideVariantHtml, handleVariantVisibilityChange } =
      createHideVariantHtmlCore({
        initializeApp,
        functions: { region },
        Storage,
        db,
        environmentVariables: {},
        deleteStorageFile,
        createEffectInvocationBoundary,
      });

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(Storage).toHaveBeenCalledTimes(1);
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(document).toHaveBeenCalledWith(
      'stories/{storyId}/pages/{pageId}/variants/{variantId}'
    );
    expect(onWrite).toHaveBeenCalledTimes(1);
    expect(hideVariantHtml).toEqual({ handler: expect.any(Function) });
    expect(handleVariantVisibilityChange).toEqual(expect.any(Function));

    const handler = onWrite.mock.calls[0][0];
    await expect(
      handler({
        before: {
          id: 'variant-a',
          data: () => ({ name: '-variant-a' }),
          ref: {
            path: 'stories/story-1/pages/page-2/variants/variant-a',
          },
        },
        after: { exists: false },
      })
    ).resolves.toBeNull();

    expect(storageBucket).toHaveBeenCalledTimes(1);
    expect(pageRef.get).toHaveBeenCalledTimes(1);
    expect(storageFileDelete).toHaveBeenCalled();
    expect(Object.isFrozen(deleteStorageFile.mock.calls[0][0])).toBe(true);
    await handler({
      before: {
        id: 'variant-b',
        data: () => ({ name: '-variant-b' }),
        ref: { path: 'stories/story-1/pages/page-2/variants/variant-b' },
      },
      after: { exists: false },
    });
    expect(Object.isFrozen(deleteStorageFile.mock.calls[1][0])).toBe(true);
    expect(deleteStorageFile.mock.calls[1][0]).not.toBe(
      deleteStorageFile.mock.calls[0][0]
    );

    await expect(
      handler({
        before: {
          id: 'variant-missing-page-ref',
          data: () => ({ name: '-missing' }),
          ref: {},
        },
        after: { exists: false },
      })
    ).resolves.toBeNull();

    const missingPageRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    await expect(
      handler({
        before: {
          id: 'variant-missing-page',
          data: () => ({ name: '-missing-page' }),
          ref: { parent: { parent: missingPageRef } },
        },
        after: { exists: false },
      })
    ).resolves.toBeNull();
  });

  test('accepts explicit cloud defaults when provided', () => {
    const onWrite = jest.fn(handler => ({ handler }));
    const document = jest.fn(() => ({ onWrite }));
    const region = jest.fn(() => ({ firestore: { document } }));
    const initializeApp = jest.fn(() => ({ app: true }));
    const Storage = jest.fn(() => ({
      bucket: jest.fn(() => ({ file: jest.fn() })),
    }));

    createHideVariantHtmlCore({
      initializeApp,
      functions: { region },
      Storage,
      environmentVariables: {},
      deleteStorageFile,
      createEffectInvocationBoundary,
      defaultBucketName: 'custom-bucket',
      visibilityThreshold: 0.8,
    });

    expect(Storage).toHaveBeenCalledTimes(1);
    expect(region).toHaveBeenCalledTimes(1);
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  test('ignores duplicate firebase app initialization errors', () => {
    const initializeApp = jest.fn(() => {
      throw { message: 'app already exists' };
    });
    const onWrite = jest.fn(handler => ({ handler }));
    const document = jest.fn(() => ({ onWrite }));
    const region = jest.fn(() => ({ firestore: { document } }));
    const Storage = jest.fn(() => ({
      bucket: jest.fn(() => ({ file: jest.fn() })),
    }));

    expect(() =>
      createHideVariantHtmlCore({
        initializeApp,
        functions: { region },
        Storage,
        environmentVariables: {},
        deleteStorageFile,
        createEffectInvocationBoundary,
      })
    ).not.toThrow();
  });

  test('rethrows unexpected firebase app initialization errors', () => {
    const initializeApp = jest.fn(() => {
      throw new Error('boom');
    });
    const onWrite = jest.fn(handler => ({ handler }));
    const document = jest.fn(() => ({ onWrite }));
    const region = jest.fn(() => ({ firestore: { document } }));
    const Storage = jest.fn(() => ({
      bucket: jest.fn(() => ({ file: jest.fn() })),
    }));

    expect(() =>
      createHideVariantHtmlCore({
        initializeApp,
        functions: { region },
        Storage,
        environmentVariables: {},
        deleteStorageFile,
        createEffectInvocationBoundary,
      })
    ).toThrow('boom');
  });
});
