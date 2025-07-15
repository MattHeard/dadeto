import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

initializeApp();
const db = getFirestore();

export const processNewStory = functions
  .region('europe-west3')
  .firestore.document('storyFormSubmissions/{subId}')
  .onCreate(async (snap, ctx) => {
    const sub = snap.data();
    if (sub.processed) {
      return null;
    }

    const storyId = ctx.params.subId;
    const pageId = 'p1';
    const variantId = 'vA';

    const storyRef = db.doc(`stories/${storyId}`);
    const pageRef = storyRef.collection('pages').doc(pageId);
    const variantRef = pageRef.collection('variants').doc(variantId);

    const batch = db.batch();
    batch.set(storyRef, {
      title: sub.title,
      rootPage: pageRef,
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.set(pageRef, {
      pageNumber: 1,
      incomingOptionId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.set(variantRef, {
      pageLetter: 'A',
      content: sub.content,
      authorId: null,
      incomingOptionId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    sub.options.forEach((text, i) => {
      const optionRef = variantRef.collection('options').doc(`o${i + 1}`);
      batch.set(optionRef, {
        content: text,
        targetPageId: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    batch.set(db.doc(`storyStats/${storyId}`), { variantCount: 1 });
    batch.update(snap.ref, { processed: true });

    await batch.commit();
    return null;
  });
