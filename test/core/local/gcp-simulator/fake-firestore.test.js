import { describe, expect, it } from '@jest/globals';
import {
  createFakeFieldValue,
  createFakeFirestore,
  fakeFirestoreTestUtils,
} from '../../../../src/core/local/gcp-simulator/fake-firestore.js';

describe('fake firestore', () => {
  it('supports writes, snapshots, nested patches, and helper state access', async () => {
    const now = new Date('2026-06-07T00:00:00.000Z');
    const fieldValue = createFakeFieldValue(() => now);
    const commits = [];
    const db = createFakeFirestore({
      onCommit: events => commits.push(events),
    });

    const storyRef = db.doc('/stories/story-1/');
    const pageRef = storyRef.collection('pages').doc('1');
    const variantRef = pageRef.collection('variants').doc('a');

    expect(storyRef.path).toBe('stories/story-1');
    expect(storyRef.parent.path).toBe('stories');
    expect(storyRef.parent.parent).toBeNull();
    expect(pageRef.parent.path).toBe('stories/story-1/pages');
    expect(variantRef.parent.parent.path).toBe(pageRef.path);

    await storyRef.set({
      title: 'Story One',
      createdAt: fieldValue.serverTimestamp(),
      relatedPage: pageRef,
      nested: {
        ref: pageRef,
        timestamps: [fieldValue.serverTimestamp()],
      },
      tags: ['one', { page: pageRef }],
      count: fieldValue.increment(2),
      removeMe: 'x',
    });

    const initialSnap = await storyRef.get();
    expect(initialSnap.exists).toBe(true);
    expect(initialSnap.data()).toMatchObject({
      title: 'Story One',
      createdAt: now,
      relatedPage: pageRef,
      nested: {
        ref: pageRef,
        timestamps: [now],
      },
      tags: ['one', { page: pageRef }],
      count: 2,
      removeMe: 'x',
    });

    await storyRef.update({
      'nested.depth': 3,
      count: fieldValue.increment(4),
      removeMe: fieldValue.delete(),
      updatedAt: fieldValue.serverTimestamp(),
    });

    const updatedSnap = await storyRef.get();
    expect(updatedSnap.data()).toMatchObject({
      nested: {
        ref: pageRef,
        timestamps: [now],
        depth: 3,
      },
      count: 6,
      updatedAt: now,
    });
    expect(updatedSnap.data()).not.toHaveProperty('removeMe');

    db.__setPathData('manual/path', { flag: true });
    expect(db.__getPathData('manual/path')).toEqual({ flag: true });
    expect(db.__resolveDocumentSnapshot('manual/path').exists).toBe(true);
    db.__deletePathData('manual/path');
    expect(db.__getPathData('manual/path')).toBeUndefined();

    await db.doc('ghost/doc').delete();
    expect(commits.at(-1)).toEqual([]);

    await storyRef.delete();
    expect((await storyRef.get()).exists).toBe(false);
    expect(commits.at(-1)).toEqual([
      {
        path: 'stories/story-1',
        before: expect.any(Object),
        after: undefined,
      },
    ]);

    await expect(
      db.doc('missing/doc').update({ title: 'fail' })
    ).rejects.toThrow('Cannot update missing document: missing/doc');
  });

  it('supports collection queries, collection groups, ordering, limits, and counts', async () => {
    const db = createFakeFirestore();

    await db
      .batch()
      .set(db.doc('things/a'), { rank: 3, label: 'c', maybe: null })
      .set(db.doc('things/b'), { rank: 1, label: 'a', maybe: 0 })
      .set(db.doc('things/c'), { rank: 2, label: 'b', maybe: null })
      .set(db.doc('stories/story-1/pages/1/variants/a'), { score: 10 })
      .set(db.doc('stories/story-1/pages/2/variants/b'), { score: 0 })
      .commit();

    const ordered = await db
      .collection('things')
      .orderBy('rank', 'asc')
      .limit(3)
      .get();
    expect(ordered.docs.map(doc => doc.id)).toEqual(['b', 'c', 'a']);

    const nullFiltered = await db
      .collection('things')
      .where('maybe', '==', null)
      .get();
    expect(nullFiltered.docs.map(doc => doc.id).sort()).toEqual(['a', 'c']);

    const rankedCount = await db.collection('things').count().get();
    expect(rankedCount.data()).toEqual({ count: 3 });

    const group = await db
      .collectionGroup('variants')
      .where('score', '==', 0)
      .get();
    expect(group.docs.map(doc => doc.ref.path)).toEqual([
      'stories/story-1/pages/2/variants/b',
    ]);

    await expect(
      db.collection('things').where('rank', '>', 1).get()
    ).rejects.toThrow('Unsupported where operator: >');

    expect(db.collection('things').parent).toBeNull();
    expect(db.doc('stories/story-1').collection('pages').parent.path).toBe(
      'stories/story-1'
    );
  });

  it('covers helper edge cases and document iteration', async () => {
    const fieldValue = createFakeFieldValue(
      () => new Date('2026-06-07T00:00:00.000Z')
    );
    const db = createFakeFirestore();

    await db.doc('things/item').set({
      nested: 1,
      removeMe: fieldValue.delete(),
      title: 'Edge',
    });

    expect(await db.__getDocument('things/item')).toMatchObject({
      nested: 1,
      title: 'Edge',
    });

    await db.doc('things/item').update({
      'nested.depth': 2,
      '': 'ignored',
      updatedAt: fieldValue.serverTimestamp(),
    });

    const snapshot = await db.collection('things').get();
    const ids = [];
    snapshot.forEach(doc => ids.push(doc.id));
    expect(ids).toEqual(['item']);

    expect((await db.doc('things/item').get()).data()).toMatchObject({
      nested: {
        depth: 2,
      },
      updatedAt: new Date('2026-06-07T00:00:00.000Z'),
    });

    await db.batch().delete(db.doc('ghost/missing')).commit();

    db.__setPathData('odd/path/extra', { score: 1 });
    const group = await db.collectionGroup('path').get();
    expect(group.empty).toBe(true);
  });

  it('covers ordering comparisons with null and equal values', async () => {
    const db = createFakeFirestore();

    await db
      .batch()
      .set(db.doc('things/a'), { rank: null, nested: { score: 2 } })
      .set(db.doc('things/b'), { rank: 1, nested: { score: 1 } })
      .set(db.doc('things/c'), { rank: 1, nested: { score: 1 } })
      .commit();
    db.__setPathData('things/d', null);

    const ordered = await db
      .collection('things')
      .orderBy('rank', 'asc')
      .orderBy('nested.score', 'desc')
      .get();
    expect(ordered.size).toBe(4);

    const nullRanks = await db
      .collection('things')
      .where('rank', '==', null)
      .get();
    expect(nullRanks.size).toBe(2);

    const nullData = await db
      .collection('things')
      .where('nested.score', '==', null)
      .get();
    expect(nullData.size).toBeGreaterThanOrEqual(1);

    db.__setPathData('other/item', { rank: 99 });
    const prefixMismatch = await db.collection('things').get();
    expect(prefixMismatch.size).toBe(4);

    const missingSnapshot = await db.doc('missing/doc').get();
    expect(missingSnapshot.exists).toBe(false);
    expect(missingSnapshot.data()).toBeUndefined();
  });

  it('covers the helper branches that are only exercised by low-level unit tests', () => {
    expect(
      fakeFirestoreTestUtils.getFieldValue({ nested: 5 }, 'nested.value')
    ).toBeUndefined();
    expect(fakeFirestoreTestUtils.matchesPrefix(['a'], ['a'])).toBe(false);
    expect(
      fakeFirestoreTestUtils.buildEventsFromTouched(new Map(), [
        { path: 'missing/path' },
      ])
    ).toEqual([]);
    expect(
      fakeFirestoreTestUtils.cloneDocument({
        createdAt: new Date('2026-06-07T00:00:00.000Z'),
      })
    ).toEqual({
      createdAt: new Date('2026-06-07T00:00:00.000Z'),
    });
  });

  it('covers write defaults, undefined update patches, and increment coercion', async () => {
    const db = createFakeFirestore();
    const fieldValue = createFakeFieldValue();

    await db.__writeDocument('manual/default', {
      flag: true,
    });
    expect(await db.__getDocument('manual/default')).toMatchObject({
      flag: true,
    });

    await db.doc('manual/default').set({
      count: 'not-a-number',
    });
    await db.__commitOperations([
      {
        path: 'manual/default',
        nextData: undefined,
        mode: 'update',
      },
    ]);
    await db.doc('manual/default').update({
      count: fieldValue.increment(3),
    });

    expect(await db.__getDocument('manual/default')).toMatchObject({
      count: 3,
    });
  });

  it('covers null-null ordering and nullish comparison branches', async () => {
    const db = createFakeFirestore();

    await db
      .batch()
      .set(db.doc('things/a'), { rank: null })
      .set(db.doc('things/b'), { rank: null })
      .commit();

    const ordered = await db.collection('things').orderBy('rank', 'asc').get();
    expect(ordered.docs.map(doc => doc.id)).toEqual(['a', 'b']);
  });
});
