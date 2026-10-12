import { jest } from '@jest/globals';
import { registerAuthorWriteTrigger } from '../../../src/cloud/render-author/trigger-effect-adapter.js';

test('registers the author trigger using the startup permission boundary', () => {
  const trigger = jest.fn();
  const handler = jest.fn();
  const onWrite = jest.fn(() => trigger);
  const document = jest.fn(() => ({ onWrite }));
  const database = jest.fn(() => ({ document }));
  const functions = {
    region: jest.fn(() => ({
      firestore: { database },
    })),
  };
  const allowEffects = Object.freeze({ startup: true });

  const result = registerAuthorWriteTrigger(allowEffects, {
    functions,
    region: 'europe-west1',
    documentPath: 'authors/{authorId}',
    database: 'dadeto',
    handler,
  });

  expect(result).toBe(trigger);
  expect(functions.region).toHaveBeenCalledWith('europe-west1');
  expect(database).toHaveBeenCalledWith('dadeto');
  expect(document).toHaveBeenCalledWith('authors/{authorId}');
  expect(onWrite).toHaveBeenCalledWith(expect.any(Function));
  const registeredHandler = onWrite.mock.calls[0][0];
  expect(registeredHandler('change')).toBeUndefined();
  expect(handler).toHaveBeenCalledWith('change');
});

test('registers on the default Firestore namespace when no database is configured', () => {
  const onWrite = jest.fn();
  const document = jest.fn(() => ({ onWrite }));
  const database = jest.fn();
  const functions = {
    region: jest.fn(() => ({
      firestore: { database, document },
    })),
  };

  registerAuthorWriteTrigger(Object.freeze({}), {
    functions,
    region: 'europe-west1',
    documentPath: 'authors/{authorId}',
    handler: jest.fn(),
  });

  expect(database).not.toHaveBeenCalled();
  expect(document).toHaveBeenCalledWith('authors/{authorId}');
});
