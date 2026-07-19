import { jest } from '@jest/globals';
import { runRenderAuthor } from '../../../../src/core/cloud/render-author/run.js';

describe('runRenderAuthor', () => {
  test('wires the Firestore trigger and author dependencies', async () => {
    const onWrite = jest.fn(handler => handler);
    const document = jest.fn(() => ({ onWrite }));
    const firestore = { document };
    const region = jest.fn(() => ({ firestore }));
    const functions = { region };
    const save = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const bucket = { file: jest.fn(() => ({ save })) };
    const Storage = jest.fn(() => ({ bucket: jest.fn(() => bucket) }));
    const FieldValue = { delete: jest.fn(() => 'deleted') };
    const db = {};
    const getFirestoreInstance = jest.fn(() => db);

    const result = runRenderAuthor({
      functions,
      Storage,
      FieldValue,
      getFirestoreInstance,
    });

    expect(getFirestoreInstance).toHaveBeenCalledTimes(2);
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(document).toHaveBeenCalledWith('authors/{authorId}');
    expect(Storage).toHaveBeenCalled();
    expect(result.renderAuthor).toEqual(expect.any(Function));

    await result.renderAuthor({
      after: {
        exists: true,
        data: () => ({ uuid: 'u1', dirty: true }),
        ref: { id: 'u1', update },
      },
    });
    expect(save).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});
