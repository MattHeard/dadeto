import { jest } from '@jest/globals';
import { createFirestoreHandle } from '../../../src/core/cloud/firestore-handle.js';

describe('createFirestoreHandle', () => {
  it('creates a Firestore onCreate handle with the injected database', () => {
    const handle = Symbol('handle');
    const db = { collection: jest.fn() };
    const eventHandler = jest.fn();
    const onCreate = jest.fn(() => handle);
    const document = jest.fn(() => ({ onCreate }));
    const firestore = { document };
    const regionResult = { firestore };
    const functions = { region: jest.fn(() => regionResult) };
    const getFirestoreInstance = jest.fn(() => db);
    const createHandler = jest.fn(() => eventHandler);

    expect(
      createFirestoreHandle({
        functions,
        getFirestoreInstance,
        createHandler,
        documentPath: 'things/{thingId}',
      })
    ).toBe(handle);

    expect(getFirestoreInstance).toHaveBeenCalledTimes(1);
    expect(createHandler).toHaveBeenCalledWith({ db });
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(document).toHaveBeenCalledWith('things/{thingId}');
    expect(onCreate).toHaveBeenCalledWith(eventHandler);
  });

  it('supports custom regions and Firestore event names', () => {
    const handle = Symbol('handle');
    const onWrite = jest.fn(() => handle);
    const functions = {
      region: jest.fn(() => ({
        firestore: {
          document: jest.fn(() => ({ onWrite })),
        },
      })),
    };

    expect(
      createFirestoreHandle({
        functions,
        getFirestoreInstance: jest.fn(() => ({ firestore: true })),
        createHandler: jest.fn(() => jest.fn()),
        documentPath: 'stories/{storyId}',
        eventName: 'onWrite',
        region: 'us-central1',
      })
    ).toBe(handle);

    expect(functions.region).toHaveBeenCalledWith('us-central1');
  });
});
