import { jest } from '@jest/globals';
await jest.unstable_mockModule(
  '../../../../src/core/cloud/render-author/render-author-core.js',
  () => ({
    createRenderAuthorHandler:
      ({ saveAuthorHtml, updateAuthorDocument, deleteField }) =>
      async (allowEffects, change) => {
        if (!change.after.exists) return;
        await saveAuthorHtml(allowEffects, 'author.html', 'rendered html');
        await updateAuthorDocument(allowEffects, change.after.ref, {
          rendered: true,
          dirty: deleteField(),
        });
      },
  })
);
const { runRenderAuthor } = await import(
  '../../../../src/core/cloud/render-author/run.js'
);

describe('runRenderAuthor', () => {
  test('wires the Firestore trigger and author dependencies', async () => {
    const startupPermission = Object.freeze({ startup: 'render-author' });
    const invocationPermission = Object.freeze({ invocation: 'render-author' });
    const save = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const bucket = { file: jest.fn(() => ({ save })) };
    const Storage = jest.fn(() => ({ bucket: jest.fn(() => bucket) }));
    const FieldValue = { delete: jest.fn(() => 'deleted') };
    const db = {};
    const registerAuthorWriteTrigger = jest.fn(
      (permission, { handler }) => handler
    );
    const saveAuthorHtml = jest.fn((permission, receivedBucket, path, html) =>
      receivedBucket.file(path).save(html, { contentType: 'text/html' })
    );
    const updateAuthorDocument = jest.fn((permission, reference, value) =>
      reference.update(value)
    );

    const result = runRenderAuthor(startupPermission, {
      db,
      Storage,
      FieldValue,
      saveAuthorHtml,
      updateAuthorDocument,
      registerAuthorWriteTrigger,
      bindEffectBoundary: handler => handler(invocationPermission),
    });

    expect(registerAuthorWriteTrigger).toHaveBeenCalledWith(
      startupPermission,
      expect.objectContaining({
        region: 'europe-west1',
        documentPath: 'authors/{authorId}',
      })
    );
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
    expect(saveAuthorHtml).toHaveBeenCalledWith(
      invocationPermission,
      bucket,
      'author.html',
      'rendered html'
    );
    expect(updateAuthorDocument).toHaveBeenCalledWith(
      invocationPermission,
      expect.objectContaining({ id: 'u1' }),
      { rendered: true, dirty: 'deleted' }
    );
    expect(FieldValue.delete).toHaveBeenCalledTimes(1);
  });
});
